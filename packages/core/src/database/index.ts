import { Resource } from '@quizfunnel/resource'
import type { ExtractTablesWithRelations } from 'drizzle-orm'
import { PgTransaction, type PgTransactionConfig } from 'drizzle-orm/pg-core'
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { Context } from '../utils/context'
import { memo } from '../utils/memo'

export namespace Database {
  export type Transaction = PgTransaction<
    PostgresJsQueryResultHKT,
    Record<string, unknown>,
    ExtractTablesWithRelations<Record<string, unknown>>
  >

  const client = memo(() => {
    const result = postgres({
      host: Resource.Database.host,
      database: Resource.Database.database,
      user: Resource.Database.username,
      password: Resource.Database.password,
      port: Resource.Database.port,
    })
    const db = drizzle(result, {})
    return db
  })

  export type TxOrDb = Transaction | ReturnType<typeof client>

  const TransactionContext = Context.create<{
    tx: TxOrDb
    effects: (() => void | Promise<void>)[]
  }>()

  export async function use<T>(callback: (trx: TxOrDb) => Promise<T>) {
    try {
      const { tx } = TransactionContext.use()
      return tx.transaction(callback)
    } catch (err) {
      if (err instanceof Context.NotFound) {
        const effects: (() => void | Promise<void>)[] = []
        const result = await TransactionContext.provide(
          {
            effects,
            tx: client(),
          },
          () => callback(client()),
        )
        await Promise.all(effects.map((x) => x()))
        return result
      }
      throw err
    }
  }

  export async function fn<Input, T>(callback: (input: Input, trx: TxOrDb) => Promise<T>) {
    return (input: Input) => use(async (tx) => callback(input, tx))
  }

  export async function effect(effect: () => any | Promise<any>) {
    try {
      const { effects } = TransactionContext.use()
      effects.push(effect)
    } catch {
      await effect()
    }
  }

  export async function transaction<T>(callback: (tx: TxOrDb) => Promise<T>, config?: PgTransactionConfig) {
    try {
      const { tx } = TransactionContext.use()
      return callback(tx)
    } catch (err) {
      if (err instanceof Context.NotFound) {
        const effects: (() => void | Promise<void>)[] = []
        const result = await client().transaction(async (tx) => {
          return TransactionContext.provide({ tx, effects }, () => callback(tx))
        }, config)
        await Promise.all(effects.map((x) => x()))
        return result
      }
      throw err
    }
  }
}
