import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm'
import { createWriteStream } from 'node:fs'
import { Actor } from '../src/actor'
import { AnswerTable, AnswerValueTable } from '../src/answer/index.sql'
import { Database } from '../src/database'
import { FunnelTable } from '../src/funnel/index.sql'
import { QuestionTable } from '../src/question/index.sql'
import { SubmissionTable } from '../src/submission/index.sql'

const BATCH_SIZE = 1000

// Parse arguments
const [funnelId, outputPath] = process.argv.slice(2)

if (!funnelId?.startsWith('fun_')) {
  console.error('Usage: bun scripts/export-responses.ts <funnel-id> [output-path]')
  console.error('  funnel-id: fun_xxxx...')
  console.error('  output-path: (default: ~/Downloads/responses-<funnel-id>.csv)')
  process.exit(1)
}

// Look up funnel to get workspaceId
const funnel = await Database.use((tx) =>
  tx
    .select({ workspaceId: FunnelTable.workspaceId, title: FunnelTable.title })
    .from(FunnelTable)
    .where(eq(FunnelTable.id, funnelId))
    .then((r) => r[0]),
)

if (!funnel) {
  console.error(`Funnel ${funnelId} not found`)
  process.exit(1)
}

const filePath = outputPath ?? `${process.env.HOME}/Downloads/responses-${funnelId}.csv`

console.log(`Exporting responses for "${funnel.title}" (${funnelId})...`)

await Actor.provide('system', { workspaceId: funnel.workspaceId }, async () => {
  const workspaceId = funnel.workspaceId

  // 1. Fetch questions for this funnel, sorted by index
  const questions = await Database.use((tx) =>
    tx
      .select({
        id: QuestionTable.id,
        title: QuestionTable.title,
        index: QuestionTable.index,
        options: QuestionTable.options,
      })
      .from(QuestionTable)
      .where(and(eq(QuestionTable.workspaceId, workspaceId), eq(QuestionTable.funnelId, funnelId)))
      .orderBy(QuestionTable.index),
  )

  // Build optionId -> label lookup per question
  const optionLabelMap = new Map<string, Map<string, string>>()
  for (const q of questions) {
    if (q.options) {
      const map = new Map<string, string>()
      for (const opt of q.options) {
        map.set(opt.id, opt.label)
      }
      optionLabelMap.set(q.id, map)
    }
  }

  // 2. Count total submissions
  const countResult = await Database.use((tx) =>
    tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(SubmissionTable)
      .where(and(eq(SubmissionTable.workspaceId, workspaceId), eq(SubmissionTable.funnelId, funnelId))),
  )
  const total = countResult[0]?.count ?? 0

  if (total === 0) {
    console.log('No submissions found. Nothing to export.')
    process.exit(0)
  }

  console.log(`Total submissions: ${total}`)

  // 3. Open file and write CSV header
  const stream = createWriteStream(filePath, 'utf-8')
  const header = ['Submitted at', ...questions.map((q) => q.title)]
  stream.write(header.map(escapeCsv).join(',') + '\n')

  // 4. Cursor-based pagination through all submissions
  let cursor: { updatedAt: Date; id: string } | null = null
  let exported = 0

  while (true) {
    const whereConditions = [eq(SubmissionTable.workspaceId, workspaceId), eq(SubmissionTable.funnelId, funnelId)]

    if (cursor) {
      // (updated_at, id) < (cursorUpdatedAt, cursorId)
      whereConditions.push(
        or(
          lt(SubmissionTable.updatedAt, cursor.updatedAt),
          and(eq(SubmissionTable.updatedAt, cursor.updatedAt), lt(SubmissionTable.id, cursor.id)),
        )!,
      )
    }

    const submissions = await Database.use((tx) =>
      tx
        .select({
          id: SubmissionTable.id,
          updatedAt: SubmissionTable.updatedAt,
        })
        .from(SubmissionTable)
        .where(and(...whereConditions))
        .orderBy(desc(SubmissionTable.updatedAt), desc(SubmissionTable.id))
        .limit(BATCH_SIZE),
    )

    if (submissions.length === 0) break

    // Fetch answers for this batch
    const submissionIds = submissions.map((s) => s.id)
    const answers = await Database.use((tx) =>
      tx
        .select({
          submissionId: AnswerTable.submissionId,
          questionId: AnswerTable.questionId,
          text: AnswerValueTable.text,
          number: AnswerValueTable.number,
          optionId: AnswerValueTable.optionId,
        })
        .from(AnswerTable)
        .innerJoin(
          AnswerValueTable,
          and(eq(AnswerValueTable.workspaceId, AnswerTable.workspaceId), eq(AnswerValueTable.answerId, AnswerTable.id)),
        )
        .where(and(eq(AnswerTable.workspaceId, workspaceId), inArray(AnswerTable.submissionId, submissionIds))),
    )

    // Group answers by submission -> question -> values
    const answersBySubmission = new Map<string, Map<string, string[]>>()
    for (const answer of answers) {
      let submissionAnswers = answersBySubmission.get(answer.submissionId)
      if (!submissionAnswers) {
        submissionAnswers = new Map()
        answersBySubmission.set(answer.submissionId, submissionAnswers)
      }

      let questionAnswers = submissionAnswers.get(answer.questionId)
      if (!questionAnswers) {
        questionAnswers = []
        submissionAnswers.set(answer.questionId, questionAnswers)
      }

      if (answer.text !== null) {
        questionAnswers.push(answer.text)
      } else if (answer.optionId !== null) {
        const label = optionLabelMap.get(answer.questionId)?.get(answer.optionId) ?? answer.optionId
        questionAnswers.push(label)
      } else if (answer.number !== null) {
        questionAnswers.push(String(answer.number))
      }
    }

    // Write rows for this batch
    for (const submission of submissions) {
      const date = formatDate(submission.updatedAt)
      const submissionAnswers = answersBySubmission.get(submission.id)
      const values = questions.map((q) => submissionAnswers?.get(q.id)?.join(', ') ?? '')
      stream.write([date, ...values].map(escapeCsv).join(',') + '\n')
    }

    exported += submissions.length
    const last = submissions[submissions.length - 1]
    cursor = { updatedAt: last.updatedAt, id: last.id }

    const pct = Math.round((exported / total) * 100)
    process.stdout.write(`\r  ${exported.toLocaleString('en-US')} / ${total.toLocaleString('en-US')} (${pct}%)`)

    if (submissions.length < BATCH_SIZE) break
  }

  // Wait for the stream to finish
  await new Promise<void>((resolve, reject) => {
    stream.end(() => resolve())
    stream.on('error', reject)
  })

  console.log(`\nExported ${exported} responses to ${filePath}`)
})

// Format date to match the UI: "Jan 1, 2025, 12:00 PM"
function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Escape a value for CSV (handle commas, quotes, newlines)
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
