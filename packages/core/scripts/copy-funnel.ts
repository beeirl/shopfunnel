import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { and, eq, inArray } from 'drizzle-orm'
import { Resource } from 'sst'
import { Database } from '../src/database'
import { FileTable } from '../src/file/index.sql'
import { FunnelFileTable, FunnelTable, FunnelVersionTable } from '../src/funnel/index.sql'
import { Identifier } from '../src/identifier'
import { WorkspaceTable } from '../src/workspace/index.sql'

// Parse arguments
const funnelId = process.argv[2]
const targetWorkspaceId = process.argv[3]

if (!funnelId?.startsWith('fun_') || !targetWorkspaceId?.startsWith('wrk_')) {
  console.error('Usage: bun scripts/copy-funnel.ts <funnel-id> <target-workspace-id>')
  console.error('  funnel-id: fun_xxxx...')
  console.error('  target-workspace-id: wrk_xxxx...')
  process.exit(1)
}

// Create S3 client for R2 copy operations
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${Resource.CLOUDFLARE_DEFAULT_ACCOUNT_ID.value}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Resource.CLOUDFLARE_R2_ACCESS_KEY_ID.value,
    secretAccessKey: Resource.CLOUDFLARE_R2_SECRET_ACCESS_KEY.value,
  },
})
const bucketName = (Resource.Storage as unknown as { name: string }).name

// Verify target workspace exists
const targetWorkspace = await Database.use((tx) =>
  tx
    .select()
    .from(WorkspaceTable)
    .where(eq(WorkspaceTable.id, targetWorkspaceId))
    .then((r) => r[0]),
)
if (!targetWorkspace) {
  console.error(`Target workspace ${targetWorkspaceId} not found`)
  process.exit(1)
}

// Fetch source funnel
const funnel = await Database.use((tx) =>
  tx
    .select()
    .from(FunnelTable)
    .where(eq(FunnelTable.id, funnelId))
    .then((r) => r[0]),
)
if (!funnel) {
  console.error(`Funnel ${funnelId} not found`)
  process.exit(1)
}
const sourceWorkspaceId = funnel.workspaceId

// Fetch only the current version
const currentVersionData = await Database.use((tx) =>
  tx
    .select()
    .from(FunnelVersionTable)
    .where(and(eq(FunnelVersionTable.funnelId, funnelId), eq(FunnelVersionTable.version, funnel.currentVersion)))
    .then((r) => r[0]),
)
if (!currentVersionData) {
  console.error(`Current version ${funnel.currentVersion} not found for funnel ${funnelId}`)
  process.exit(1)
}

// Extract file IDs that are actually used in the pages JSON
const extractFileIdsFromPages = (pages: unknown[], workspaceId: string): Set<string> => {
  const json = JSON.stringify(pages)
  const regex = new RegExp(`workspace/${workspaceId}/(fil_[a-zA-Z0-9]+)`, 'g')
  const fileIds = new Set<string>()
  let match
  while ((match = regex.exec(json)) !== null) {
    fileIds.add(match[1])
  }
  return fileIds
}

const usedFileIds = extractFileIdsFromPages(currentVersionData.pages, sourceWorkspaceId)
const usedFileIdsArray = Array.from(usedFileIds)

// Fetch only the files that are actually used in the current version
const files =
  usedFileIdsArray.length > 0
    ? await Database.use((tx) =>
        tx
          .select()
          .from(FileTable)
          .where(and(eq(FileTable.workspaceId, sourceWorkspaceId), inArray(FileTable.id, usedFileIdsArray))),
      )
    : []

// Generate new IDs and mappings
const newFunnelId = Identifier.create('funnel')
const newShortId = newFunnelId.slice(-8)

const fileIdMap = new Map<string, string>()
for (const file of files) {
  fileIdMap.set(file.id, Identifier.create('file'))
}

// Transform page JSON - replace file URLs
const transformPages = (pages: any[]) => {
  let json = JSON.stringify(pages)
  for (const [oldFileId, newFileId] of fileIdMap) {
    const oldPath = `workspace/${sourceWorkspaceId}/${oldFileId}`
    const newPath = `workspace/${targetWorkspaceId}/${newFileId}`
    json = json.replaceAll(oldPath, newPath)
  }
  return JSON.parse(json)
}

// Copy R2 files
console.log(`Copying ${files.length} files...`)
for (const file of files) {
  const oldKey = `workspace/${sourceWorkspaceId}/${file.id}`
  const newKey = `workspace/${targetWorkspaceId}/${fileIdMap.get(file.id)}`
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${oldKey}`,
      Key: newKey,
    }),
  )
}

// Insert all records in transaction
await Database.transaction(async (tx) => {
  // Files
  if (files.length > 0) {
    await tx.insert(FileTable).values(
      files.map((f) => ({
        ...f,
        id: fileIdMap.get(f.id)!,
        workspaceId: targetWorkspaceId,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      })),
    )
  }

  // Funnel (always starts as draft - user must publish manually)
  await tx.insert(FunnelTable).values({
    ...funnel,
    id: newFunnelId,
    workspaceId: targetWorkspaceId,
    shortId: newShortId,
    currentVersion: 1,
    publishedVersion: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  })

  // Version (only the current version, reset to version 1)
  await tx.insert(FunnelVersionTable).values({
    workspaceId: targetWorkspaceId,
    funnelId: newFunnelId,
    version: 1,
    pages: transformPages(currentVersionData.pages),
    rules: currentVersionData.rules,
    variables: currentVersionData.variables,
    theme: currentVersionData.theme,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // FunnelFile junction (only for files that are actually used)
  if (files.length > 0) {
    await tx.insert(FunnelFileTable).values(
      files.map((f) => ({
        workspaceId: targetWorkspaceId,
        funnelId: newFunnelId,
        fileId: fileIdMap.get(f.id)!,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    )
  }
})

// Print summary
console.log('\n' + '─'.repeat(40))
console.log('Funnel copied successfully!')
console.log('─'.repeat(40))
console.log(`Source:    ${funnelId} (${funnel.title})`)
console.log(`Target:    ${newFunnelId}`)
console.log(`ShortId:   ${newShortId}`)
console.log(`Workspace: ${targetWorkspaceId} (${targetWorkspace.name})`)
console.log('─'.repeat(40))
console.log(`Version:       ${funnel.currentVersion} -> 1 (draft)`)
console.log(`Files:         ${files.length}`)
console.log('─'.repeat(40))
