import { database } from './database'
import { secret } from './secret'
import { domain } from './stage'

const authStorage = new sst.cloudflare.Kv('AuthStorage')

export const auth = new sst.cloudflare.Worker('AuthApi', {
  handler: 'packages/function/src/auth.ts',
  url: true,
  domain: `auth.${domain}`,
  link: [authStorage, database, secret.GOOGLE_CLIENT_ID],
  transform: {
    worker: {
      observability: {
        enabled: true,
      },
    },
  },
})

if ($app.stage === 'production') {
  new cloudflare.WorkersRoute('AuthWorkerRoute', {
    zoneId: secret.CLOUDFLARE_ZONE_ID.value,
    pattern: `auth.${domain}/*`,
    script: auth.nodes.worker.scriptName,
  })
}
