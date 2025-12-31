import { and, eq, isNull, sql } from 'drizzle-orm'
import { groupBy, map, pipe, values } from 'remeda'
import z from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { File } from '../file'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import { QuizFileTable, QuizTable, QuizVersionTable } from './index.sql'
import { Info, RADII, Rule, Step, Variables, type Theme } from './types'

export namespace Quiz {
  const NEW_VERSION_THRESHOLD = 15 * 60 * 1000

  const DEFAULT_THEME: Theme = {
    colors: {
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#0a0a0a',
    },
    radius: RADII.find((radius) => radius.name === 'medium')!,
  }

  export const getCurrentVersion = fn(Identifier.schema('quiz'), (id) =>
    Database.use((tx) =>
      tx
        .select()
        .from(QuizTable)
        .innerJoin(
          QuizVersionTable,
          and(
            eq(QuizVersionTable.quizId, QuizTable.id),
            eq(QuizVersionTable.workspaceId, QuizTable.workspaceId),
            eq(QuizVersionTable.version, QuizTable.currentVersion),
          ),
        )
        .where(and(eq(QuizTable.workspaceId, Actor.workspace()), eq(QuizTable.id, id), isNull(QuizTable.archivedAt)))
        .then((rows) => serializeVersion(rows)[0]),
    ),
  )

  export const getPublishedVersion = fn(z.string(), (input) => {
    const isShortId = input.length === 8
    return Database.use((tx) =>
      tx
        .select()
        .from(QuizTable)
        .innerJoin(
          QuizVersionTable,
          and(
            eq(QuizVersionTable.quizId, QuizTable.id),
            eq(QuizVersionTable.workspaceId, QuizTable.workspaceId),
            eq(QuizVersionTable.version, QuizTable.publishedVersion),
          ),
        )
        .where(and(isShortId ? eq(QuizTable.shortId, input) : eq(QuizTable.id, input), isNull(QuizTable.archivedAt)))
        .then((rows) => serializeVersion(rows)[0]),
    )
  })

  export const list = fn(z.void(), () =>
    Database.use((tx) =>
      tx
        .select()
        .from(QuizTable)
        .where(and(eq(QuizTable.workspaceId, Actor.workspace()), isNull(QuizTable.archivedAt)))
        .then((rows) => rows.map(serialize)),
    ),
  )

  export const create = async () => {
    const id = Identifier.create('quiz')
    const shortId = id.slice(-8)
    const currentVersion = 1

    await Database.use(async (tx) => {
      await tx.insert(QuizTable).values({
        id,
        workspaceId: Actor.workspace(),
        shortId,
        title: 'My new quiz',
        currentVersion,
      })

      await tx.insert(QuizVersionTable).values({
        workspaceId: Actor.workspace(),
        quizId: id,
        version: currentVersion,
        pages: [],
        rules: [],
        variables: {},
        theme: DEFAULT_THEME,
      })
    })

    return id
  }

  export const createFile = fn(
    z.object({
      quizId: Identifier.schema('quiz'),
      contentType: z.string(),
      data: z.instanceof(Buffer),
      name: z.string(),
      size: z.number(),
    }),
    async (input) => {
      const file = await File.create({
        contentType: input.contentType,
        data: input.data,
        name: input.name,
        size: input.size,
      })
      await Database.use((tx) =>
        tx.insert(QuizFileTable).values({
          workspaceId: Actor.workspace(),
          quizId: input.quizId,
          fileId: file.id,
        }),
      )
      return file
    },
  )

  export const update = fn(
    z.object({
      id: Identifier.schema('quiz'),
      title: z.string().min(1).max(255).optional(),
      steps: z.custom<Step[]>().optional(),
      rules: z.custom<Rule[]>().optional(),
      variables: z.custom<Variables>().optional(),
      theme: z.custom<Theme>().optional(),
    }),
    async (input) => {
      await Database.use(async (tx) => {
        const quiz = await tx
          .select({
            currentVersion: QuizTable.currentVersion,
            publishedVersion: QuizTable.publishedVersion,
          })
          .from(QuizTable)
          .where(and(eq(QuizTable.id, input.id), eq(QuizTable.workspaceId, Actor.workspace())))
          .then((rows) => rows[0])
        if (!quiz) return

        const currentVersion = await tx
          .select()
          .from(QuizVersionTable)
          .where(
            and(
              eq(QuizVersionTable.workspaceId, Actor.workspace()),
              eq(QuizVersionTable.quizId, input.id),
              eq(QuizVersionTable.version, quiz.currentVersion),
            ),
          )
          .then((rows) => rows[0])
        if (!currentVersion) return

        const published = quiz.currentVersion === quiz.publishedVersion
        const timeSinceUpdate = Date.now() - currentVersion.updatedAt.getTime()
        const needsNewVersion = published || timeSinceUpdate > NEW_VERSION_THRESHOLD

        if (needsNewVersion) {
          const newVersion = currentVersion.version + 1

          await tx.insert(QuizVersionTable).values({
            workspaceId: Actor.workspace(),
            quizId: input.id,
            version: newVersion,
            pages: input.steps ?? currentVersion.pages,
            rules: input.rules ?? currentVersion.rules,
            variables: input.variables ?? currentVersion.variables,
            theme: input.theme ?? currentVersion.theme,
          })

          await tx
            .update(QuizTable)
            .set({
              title: input.title,
              currentVersion: newVersion,
            })
            .where(and(eq(QuizTable.workspaceId, Actor.workspace()), eq(QuizTable.id, input.id)))
        } else {
          await tx
            .update(QuizVersionTable)
            .set({
              pages: input.steps,
              rules: input.rules,
              variables: input.variables,
              theme: input.theme,
            })
            .where(
              and(
                eq(QuizVersionTable.workspaceId, Actor.workspace()),
                eq(QuizVersionTable.quizId, input.id),
                eq(QuizVersionTable.version, quiz.currentVersion),
              ),
            )

          if (input.title) {
            await tx
              .update(QuizTable)
              .set({ title: input.title })
              .where(and(eq(QuizTable.workspaceId, Actor.workspace()), eq(QuizTable.id, input.id)))
          }
        }
      })
    },
  )

  export const publish = fn(Identifier.schema('quiz'), async (id) => {
    await Database.use(async (tx) => {
      const quiz = await tx
        .select()
        .from(QuizTable)
        .where(and(eq(QuizTable.workspaceId, Actor.workspace()), eq(QuizTable.id, id)))
        .then((rows) => rows[0])
      if (!quiz) return
      if (quiz.currentVersion === quiz.publishedVersion) return

      await tx
        .update(QuizTable)
        .set({
          publishedVersion: quiz.currentVersion,
          publishedAt: sql`NOW(3)`,
        })
        .where(and(eq(QuizTable.workspaceId, Actor.workspace()), eq(QuizTable.id, id)))
    })
  })

  function serialize(rows: typeof QuizTable.$inferSelect) {
    return {
      id: rows.id,
      shortId: rows.shortId,
      title: rows.title,
      published: rows.currentVersion === rows.publishedVersion,
      createdAt: rows.createdAt,
      publishedAt: rows.publishedAt,
    }
  }

  function serializeVersion(
    rows: {
      quiz: typeof QuizTable.$inferSelect
      quiz_version: typeof QuizVersionTable.$inferSelect
    }[],
  ) {
    return pipe(
      rows,
      groupBy((row) => row.quiz.id),
      values(),
      map(
        (group): Info => ({
          id: group[0].quiz.id,
          shortId: group[0].quiz.shortId,
          title: group[0].quiz.title,
          steps: group[0].quiz_version.pages,
          rules: group[0].quiz_version.rules,
          variables: group[0].quiz_version.variables,
          theme: group[0].quiz_version.theme,
          published: group[0].quiz.currentVersion === group[0].quiz.publishedVersion,
          createdAt: group[0].quiz.createdAt,
          publishedAt: group[0].quiz.publishedAt,
        }),
      ),
    )
  }
}
