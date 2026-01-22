import { analyticsQueue } from './analytics'
import { auth } from './auth'
import { database } from './database'
import { allSecrets, secret } from './secret'
import { domain } from './stage'
import { storage, STORAGE_URL, storageWorker } from './storage'

export const web = new sst.cloudflare.x.SolidStart('Web', {
  path: 'packages/web',
  domain,
  link: [
    analyticsQueue,
    database,
    storage,
    storageWorker,
    STORAGE_URL,
    ...($dev
      ? [
          new sst.Secret('CLOUDFLARE_API_TOKEN', process.env.CLOUDFLARE_API_TOKEN!),
          new sst.Secret('CLOUDFLARE_DEFAULT_ACCOUNT_ID', process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID!),
        ]
      : []),
    ...allSecrets,
  ],
  environment: {
    IS_DEV: $dev ? 'true' : 'false',
    APP_DOMAIN: domain,
    APP_STAGE: $app.stage,
    VITE_AUTH_URL: auth.url.apply((url) => url!),
  },
  transform: {
    server: {
      transform: {
        worker: {
          placement: { mode: 'smart' },
          observability: {
            enabled: true,
          },
        },
      },
    },
  },
})

if ($app.stage === 'production') {
  new cloudflare.WorkersRoute('WebWorkerRoute', {
    zoneId: secret.CLOUDFLARE_ZONE_ID.value,
    pattern: '*/*',
    script: web.nodes.server.nodes.worker.scriptName,
  })
} else {
  new cloudflare.WorkersRoute('WebWorkerRoute', {
    zoneId: secret.CLOUDFLARE_ZONE_ID.value,
    pattern: `${domain}/*`,
    script: web.nodes.server.nodes.worker.scriptName,
  })
}
