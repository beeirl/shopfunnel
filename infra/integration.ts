import { database } from './database'
import { secret } from './secret'

export const klaviyoSyncCron = new sst.cloudflare.Cron('KlaviyoSyncCron', {
  job: {
    handler: 'packages/function/src/klaviyo-sync.ts',
    link: [database, secret.KLAVIYO_CLIENT_ID, secret.KLAVIYO_CLIENT_SECRET],
  },
  schedules: ['*/5 * * * *'],
})

export const recartSyncCron = new sst.cloudflare.Cron('RecartSyncCron', {
  job: {
    handler: 'packages/function/src/recart-sync.ts',
    link: [database],
  },
  schedules: ['*/5 * * * *'],
})
