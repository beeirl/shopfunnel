import { and, desc, eq, inArray, isNotNull, lt, or } from 'drizzle-orm'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { finished } from 'node:stream/promises'
import { AnswerTable, type AnswerValue } from '../src/answer/index.sql'
import { Database } from '../src/database'
import { FunnelTable } from '../src/funnel/index.sql'
import { QuestionTable } from '../src/question/index.sql'
import { SubmissionTable } from '../src/submission/index.sql'

const DEFAULT_BATCH_SIZE = 250

type Question = typeof QuestionTable.$inferSelect

function printUsage() {
  console.error('Usage: bun scripts/export-funnel-responses.ts <funnel-id> <output-file> [--batch-size <n>]')
  console.error(
    '   or: bun scripts/export-funnel-responses.ts <funnel-id> [funnel-id ...] --output <file> [--batch-size <n>]',
  )
  console.error('  funnel-id: fun_xxxx...')
  console.error('  output-file: Path to write the CSV file to')
  console.error(`  --batch-size: Number of submissions per batch (default: ${DEFAULT_BATCH_SIZE})`)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const positional: string[] = []
  let outputFile: string | undefined

  for (let index = 0; index < args.length; index++) {
    const value = args[index]
    if (value === '--output') {
      outputFile = args[index + 1]
      if (!outputFile) {
        console.error('output file is required after --output')
        process.exit(1)
      }
      index++
      continue
    }

    positional.push(value)
  }

  let rest = positional
  let funnelIds: string[] = []

  if (!outputFile && positional.length >= 2 && positional[0]?.startsWith('fun_')) {
    funnelIds = [positional[0]]
    outputFile = positional[1]
    rest = positional.slice(2)
  } else {
    const firstNonFunnelIndex = positional.findIndex((value) => !value.startsWith('fun_'))
    funnelIds = firstNonFunnelIndex === -1 ? positional : positional.slice(0, firstNonFunnelIndex)
    rest = firstNonFunnelIndex === -1 ? [] : positional.slice(firstNonFunnelIndex)
  }

  if (funnelIds.length === 0 || !outputFile || !funnelIds.every((funnelId) => funnelId.startsWith('fun_'))) {
    printUsage()
    process.exit(1)
  }

  let batchSize = DEFAULT_BATCH_SIZE

  for (let index = 0; index < rest.length; index++) {
    const value = rest[index]

    if (value === '--batch-size') {
      const parsed = Number.parseInt(rest[index + 1] ?? '', 10)
      if (!Number.isInteger(parsed) || parsed <= 0) {
        console.error('batch-size must be a positive integer')
        process.exit(1)
      }
      batchSize = parsed
      index++
      continue
    }

    console.error(`Unknown argument: ${value}`)
    printUsage()
    process.exit(1)
  }

  return {
    funnelIds,
    outputFile: resolve(outputFile),
    batchSize,
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function escapeCsv(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function csvRow(values: string[]) {
  return `${values.map(escapeCsv).join(',')}\n`
}

function resolveAnswerValues(question: Question, optionById: Map<string, string>, value: AnswerValue): string[] {
  if (typeof value === 'string') {
    if (
      question.type === 'dropdown' ||
      question.type === 'binary_choice' ||
      question.type === 'multiple_choice' ||
      question.type === 'picture_choice'
    ) {
      return [optionById.get(value) ?? value]
    }

    return [value]
  }

  if (typeof value === 'number') {
    return [String(value)]
  }

  return value.map((optionId) => optionById.get(optionId) ?? optionId)
}

async function fetchBatch(
  workspaceId: string,
  funnelId: string,
  batchSize: number,
  cursor?: { updatedAt: Date; id: string },
) {
  return Database.use((tx) =>
    tx
      .select({
        id: SubmissionTable.id,
        updatedAt: SubmissionTable.updatedAt,
      })
      .from(SubmissionTable)
      .where(
        and(
          eq(SubmissionTable.workspaceId, workspaceId),
          eq(SubmissionTable.funnelId, funnelId),
          cursor
            ? or(
                lt(SubmissionTable.updatedAt, cursor.updatedAt),
                and(eq(SubmissionTable.updatedAt, cursor.updatedAt), lt(SubmissionTable.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(SubmissionTable.updatedAt), desc(SubmissionTable.id))
      .limit(batchSize),
  )
}

function questionSignature(question: Question) {
  return JSON.stringify({
    title: question.title,
    type: question.type,
    options: (question.options ?? []).map((option) => option.label),
  })
}

async function loadQuestions(workspaceId: string, funnelId: string) {
  return Database.use((tx) =>
    tx
      .select({
        id: QuestionTable.id,
        title: QuestionTable.title,
        index: QuestionTable.index,
        type: QuestionTable.type,
        options: QuestionTable.options,
        archivedAt: QuestionTable.archivedAt,
        createdAt: QuestionTable.createdAt,
        updatedAt: QuestionTable.updatedAt,
        workspaceId: QuestionTable.workspaceId,
        funnelId: QuestionTable.funnelId,
        blockId: QuestionTable.blockId,
      })
      .from(QuestionTable)
      .where(and(eq(QuestionTable.workspaceId, workspaceId), eq(QuestionTable.funnelId, funnelId)))
      .orderBy(isNotNull(QuestionTable.archivedAt), QuestionTable.index),
  )
}

const { funnelIds, outputFile, batchSize } = parseArgs()

const foundFunnels = await Database.use((tx) =>
  tx
    .select({
      id: FunnelTable.id,
      title: FunnelTable.title,
      workspaceId: FunnelTable.workspaceId,
    })
    .from(FunnelTable)
    .where(inArray(FunnelTable.id, funnelIds)),
)

const funnelById = new Map(foundFunnels.map((funnel) => [funnel.id, funnel]))
const funnels = funnelIds.map((funnelId) => funnelById.get(funnelId)).filter((funnel) => funnel !== undefined)

if (funnels.length !== funnelIds.length) {
  const missingFunnelId = funnelIds.find((funnelId) => !funnelById.has(funnelId))
  console.error(`Funnel ${missingFunnelId} not found`)
  process.exit(1)
}

const questionsByFunnelId = new Map(
  await Promise.all(
    funnels.map(async (funnel) => [funnel.id, await loadQuestions(funnel.workspaceId, funnel.id)] as const),
  ),
)

const baselineFunnel = funnels[0]
const baselineQuestions = questionsByFunnelId.get(baselineFunnel.id) ?? []
const baselineSignature = baselineQuestions.map(questionSignature)

for (const funnel of funnels.slice(1)) {
  const questions = questionsByFunnelId.get(funnel.id) ?? []
  const signature = questions.map(questionSignature)

  if (
    signature.length !== baselineSignature.length ||
    signature.some((value, index) => value !== baselineSignature[index])
  ) {
    console.error(`Funnel ${funnel.id} does not match the question schema of ${baselineFunnel.id}`)
    console.error('Multi-funnel export requires the same question titles, types, and option labels in the same order.')
    process.exit(1)
  }
}

await mkdir(dirname(outputFile), { recursive: true })

const stream = createWriteStream(outputFile, { encoding: 'utf8' })

const includeFunnelColumns = funnels.length > 1

stream.write(
  csvRow([
    ...(includeFunnelColumns ? ['Funnel ID', 'Funnel Title'] : []),
    'Submitted at',
    ...baselineQuestions.map((question) => question.title),
  ]),
)

console.log(`Exporting responses for ${funnels.length} funnel(s) to ${outputFile}`)

let exported = 0

for (const funnel of funnels) {
  const questions = questionsByFunnelId.get(funnel.id) ?? []
  const questionById = new Map(questions.map((question) => [question.id, question]))
  const optionLabelsByQuestionId = new Map(
    questions.map((question) => [
      question.id,
      new Map((question.options ?? []).map((option) => [option.id, option.label])),
    ]),
  )
  let cursor: { updatedAt: Date; id: string } | undefined

  while (true) {
    const submissions = await fetchBatch(funnel.workspaceId, funnel.id, batchSize, cursor)
    if (submissions.length === 0) break

    const submissionIds = submissions.map((submission) => submission.id)
    const answers = await Database.use((tx) =>
      tx
        .select({
          submissionId: AnswerTable.submissionId,
          questionId: AnswerTable.questionId,
          value: AnswerTable.value,
        })
        .from(AnswerTable)
        .where(and(eq(AnswerTable.workspaceId, funnel.workspaceId), inArray(AnswerTable.submissionId, submissionIds))),
    )

    const answersBySubmission = new Map<string, Map<string, string[]>>()

    for (const answer of answers) {
      const question = questionById.get(answer.questionId)
      if (!question) continue

      const optionById = optionLabelsByQuestionId.get(answer.questionId) ?? new Map<string, string>()

      let submissionAnswers = answersBySubmission.get(answer.submissionId)
      if (!submissionAnswers) {
        submissionAnswers = new Map()
        answersBySubmission.set(answer.submissionId, submissionAnswers)
      }

      submissionAnswers.set(answer.questionId, resolveAnswerValues(question, optionById, answer.value))
    }

    for (const submission of submissions) {
      const submissionAnswers = answersBySubmission.get(submission.id)
      const row = [
        ...(includeFunnelColumns ? [funnel.id, funnel.title] : []),
        formatDate(new Date(submission.updatedAt)),
        ...questions.map((question) => submissionAnswers?.get(question.id)?.join(', ') ?? ''),
      ]

      if (!stream.write(csvRow(row))) {
        await new Promise<void>((resolve) => {
          stream.once('drain', resolve)
        })
      }

      exported++
    }

    cursor = submissions[submissions.length - 1]

    if (exported % 1000 === 0) {
      console.log(`Exported ${exported.toLocaleString('en-US')} responses...`)
    }
  }
}

stream.end()
await finished(stream)

console.log(`Finished exporting ${exported.toLocaleString('en-US')} responses to ${outputFile}`)
