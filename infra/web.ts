import { analyticsQueue } from './analytics'
import { auth } from './auth'
import { database } from './database'
import { allSecrets, secret } from './secret'
import { domain } from './stage'
import { storage, STORAGE_URL, storageWorker } from './storage'

export const web = new sst.cloudflare.x.SolidStart('Web', {
  path: 'packages/web',
  domain,
  link: [database, storage, storageWorker, STORAGE_URL, analyticsQueue, ...allSecrets],
  environment: {
    DOMAIN: domain,
    SST_STAGE: $app.stage,
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
}
