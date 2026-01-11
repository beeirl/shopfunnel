import { secret } from './secret'

sst.Linkable.wrap(cloudflare.Queue, (queue) => ({
  properties: {
    queueId: queue.queueId,
    accountId: queue.accountId,
  },
  include: [
    sst.cloudflare.binding({
      type: 'queueBindings',
      properties: {
        queueName: queue.queueName,
      },
    }),
  ],
}))

export const analyticsQueue = new cloudflare.Queue('AnalyticsQueue', {
  accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
  queueName: `${$app.name}-${$app.stage}-analytics-queue`,
})

export const analyticsWorker = new sst.cloudflare.Worker('AnalyticsWorker', {
  handler: 'packages/function/src/analytics.ts',
  link: [analyticsQueue, secret.TINYBIRD_TOKEN],
})

new cloudflare.QueueConsumer('AnalyticsQueueConsumer', {
  accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
  queueId: analyticsQueue.queueId,
  scriptName: analyticsWorker.nodes.worker.scriptName,
  type: 'worker',
  settings: {
    batchSize: 100,
    maxRetries: 3,
  },
})
