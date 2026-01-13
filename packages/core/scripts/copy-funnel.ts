import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { eq } from 'drizzle-orm'
import { Resource } from 'sst'
import { AnswerTable, AnswerValueTable } from '../src/answer/index.sql'
import { Database } from '../src/database'
import { FileTable } from '../src/file/index.sql'
import { FunnelFileTable, FunnelTable, FunnelVersionTable } from '../src/funnel/index.sql'
import { Identifier } from '../src/identifier'
import { QuestionTable } from '../src/question/index.sql'
import { SubmissionTable } from '../src/submission/index.sql'
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

// Fetch all related data
const [versions, funnelFiles, files, submissions, questions, answers, answerValues] = await Promise.all([
  Database.use((tx) => tx.select().from(FunnelVersionTable).where(eq(FunnelVersionTable.funnelId, funnelId))),
  Database.use((tx) => tx.select().from(FunnelFileTable).where(eq(FunnelFileTable.funnelId, funnelId))),
  Database.use((tx) =>
    tx
      .select({ file: FileTable })
      .from(FileTable)
      .innerJoin(FunnelFileTable, eq(FileTable.id, FunnelFileTable.fileId))
      .where(eq(FunnelFileTable.funnelId, funnelId))
      .then((rows) => rows.map((r) => r.file)),
  ),
  Database.use((tx) => tx.select().from(SubmissionTable).where(eq(SubmissionTable.funnelId, funnelId))),
  Database.use((tx) => tx.select().from(QuestionTable).where(eq(QuestionTable.funnelId, funnelId))),
  Database.use((tx) =>
    tx
      .select({ answer: AnswerTable })
      .from(AnswerTable)
      .innerJoin(SubmissionTable, eq(AnswerTable.submissionId, SubmissionTable.id))
      .where(eq(SubmissionTable.funnelId, funnelId))
      .then((rows) => rows.map((r) => r.answer)),
  ),
  Database.use((tx) =>
    tx
      .select({ answer_value: AnswerValueTable })
      .from(AnswerValueTable)
      .innerJoin(AnswerTable, eq(AnswerValueTable.answerId, AnswerTable.id))
      .innerJoin(SubmissionTable, eq(AnswerTable.submissionId, SubmissionTable.id))
      .where(eq(SubmissionTable.funnelId, funnelId))
      .then((rows) => rows.map((r) => r.answer_value)),
  ),
])

// Generate new IDs and mappings
const newFunnelId = Identifier.create('funnel')
const newShortId = newFunnelId.slice(-8)

const fileIdMap = new Map<string, string>()
for (const file of files) {
  fileIdMap.set(file.id, Identifier.create('file'))
}

const submissionIdMap = new Map<string, string>()
for (const sub of submissions) {
  submissionIdMap.set(sub.id, Identifier.create('submission'))
}

const questionIdMap = new Map<string, string>()
for (const q of questions) {
  questionIdMap.set(q.id, Identifier.create('question'))
}

const answerIdMap = new Map<string, string>()
for (const a of answers) {
  answerIdMap.set(a.id, Identifier.create('answer'))
}

const answerValueIdMap = new Map<string, string>()
for (const av of answerValues) {
  answerValueIdMap.set(av.id, Identifier.create('answer_value'))
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

  // Funnel
  await tx.insert(FunnelTable).values({
    ...funnel,
    id: newFunnelId,
    workspaceId: targetWorkspaceId,
    shortId: newShortId,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  })

  // Versions
  if (versions.length > 0) {
    await tx.insert(FunnelVersionTable).values(
      versions.map((v) => ({
        ...v,
        workspaceId: targetWorkspaceId,
        funnelId: newFunnelId,
        pages: transformPages(v.pages),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    )
  }

  // FunnelFile junction
  if (funnelFiles.length > 0) {
    await tx.insert(FunnelFileTable).values(
      funnelFiles.map((ff) => ({
        workspaceId: targetWorkspaceId,
        funnelId: newFunnelId,
        fileId: fileIdMap.get(ff.fileId)!,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    )
  }

  // Questions
  if (questions.length > 0) {
    await tx.insert(QuestionTable).values(
      questions.map((q) => ({
        ...q,
        id: questionIdMap.get(q.id)!,
        workspaceId: targetWorkspaceId,
        funnelId: newFunnelId,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      })),
    )
  }

  // Submissions
  if (submissions.length > 0) {
    await tx.insert(SubmissionTable).values(
      submissions.map((s) => ({
        ...s,
        id: submissionIdMap.get(s.id)!,
        workspaceId: targetWorkspaceId,
        funnelId: newFunnelId,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      })),
    )
  }

  // Answers
  if (answers.length > 0) {
    await tx.insert(AnswerTable).values(
      answers.map((a) => ({
        ...a,
        id: answerIdMap.get(a.id)!,
        workspaceId: targetWorkspaceId,
        submissionId: submissionIdMap.get(a.submissionId)!,
        questionId: questionIdMap.get(a.questionId)!,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    )
  }

  // Answer Values
  if (answerValues.length > 0) {
    await tx.insert(AnswerValueTable).values(
      answerValues.map((av) => ({
        ...av,
        id: answerValueIdMap.get(av.id)!,
        workspaceId: targetWorkspaceId,
        answerId: answerIdMap.get(av.answerId)!,
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
console.log(`Versions:      ${versions.length}`)
console.log(`Files:         ${files.length}`)
console.log(`Submissions:   ${submissions.length}`)
console.log(`Questions:     ${questions.length}`)
console.log(`Answers:       ${answers.length}`)
console.log(`Answer Values: ${answerValues.length}`)
console.log('─'.repeat(40))
