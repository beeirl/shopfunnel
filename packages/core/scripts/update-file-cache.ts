import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { inArray } from 'drizzle-orm'
import { Resource } from 'sst'
import { Database } from '../src/database'
import { FileTable } from '../src/file/index.sql'
import { FunnelFileTable } from '../src/funnel/index.sql'

const CACHE_CONTROL = 'public, max-age=31536000, immutable'
const dryRun = process.argv.includes('--dry-run')

// Create S3 client for R2 operations
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Resource.CLOUDFLARE_R2_ACCESS_KEY_ID.value,
    secretAccessKey: Resource.CLOUDFLARE_R2_SECRET_ACCESS_KEY.value,
  },
})
const bucketName = (Resource.Storage as unknown as { name: string }).name

// Get all unique files that are associated with funnels
const files = await Database.use(async (tx) => {
  const funnelFiles = await tx.selectDistinct({ fileId: FunnelFileTable.fileId }).from(FunnelFileTable)

  if (funnelFiles.length === 0) {
    return []
  }

  const fileIds = funnelFiles.map((f) => f.fileId)

  return tx
    .select({
      id: FileTable.id,
      workspaceId: FileTable.workspaceId,
      contentType: FileTable.contentType,
      name: FileTable.name,
    })
    .from(FileTable)
    .where(inArray(FileTable.id, fileIds))
})

if (files.length === 0) {
  console.log('No funnel files found to update.')
  process.exit(0)
}

if (dryRun) {
  console.log('DRY RUN MODE - No changes will be made')
  console.log('')
}

console.log(`Found ${files.length} funnel files to update.`)
console.log(`Cache-Control: ${CACHE_CONTROL}`)
console.log('')

let successCount = 0
let errorCount = 0

for (const file of files) {
  const key = `workspace/${file.workspaceId}/${file.id}`

  if (dryRun) {
    console.log(`[DRY RUN] ${file.id} (${file.name}) - contentType: ${file.contentType}`)
    successCount++
    continue
  }

  try {
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: bucketName,
        Key: key,
        CopySource: `${bucketName}/${key}`,
        MetadataDirective: 'REPLACE',
        ContentType: file.contentType,
        CacheControl: CACHE_CONTROL,
      }),
    )
    successCount++
    console.log(`✓ ${file.id} (${file.name})`)
  } catch (error) {
    errorCount++
    console.error(`✗ ${file.id} (${file.name}):`, error instanceof Error ? error.message : error)
  }
}

console.log('')
console.log('─'.repeat(40))
if (dryRun) {
  console.log(`Would update: ${successCount} files`)
} else {
  console.log(`Completed: ${successCount} succeeded, ${errorCount} failed`)
}
console.log('─'.repeat(40))
