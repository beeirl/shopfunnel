import { boolean, mysqlEnum, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { timestamp, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export const BillingPlan = [
  'standard5K',
  'standard25K',
  'standard50K',
  'standard100K',
  'standard250K',
  'standard500K',
  'standard1M',
  'standard5M',
] as const

export const BillingInterval = ['month', 'year'] as const

export const BillingTable = mysqlTable(
  'billing',
  {
    ...workspaceColumns,
    ...timestampColumns,
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    exempted: boolean('exempted'),
    plan: mysqlEnum('plan', BillingPlan),
    managed: boolean('managed'),
    interval: mysqlEnum('interval', BillingInterval),
    trialStartedAt: timestamp('trial_started_at'),
    trialEndsAt: timestamp('trial_ends_at'),
    periodStartedAt: timestamp('period_started_at'),
    periodEndsAt: timestamp('period_ends_at'),
    pendingPlan: mysqlEnum('pending_plan', BillingPlan),
  },
  (table) => [
    ...workspaceIndexes(table),
    uniqueIndex('stripe_customer_id').on(table.stripeCustomerId),
    uniqueIndex('stripe_subscription_id').on(table.stripeSubscriptionId),
  ],
)
