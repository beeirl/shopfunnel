import { secret } from './secret'
import { domain } from './stage'

export const storage = new sst.cloudflare.Bucket('Storage')

export const storageWorker = new sst.cloudflare.Worker('StorageWorker', {
  handler: 'packages/function/src/storage.ts',
  url: true,
  domain: `storage.${domain}`,
  link: [storage],
  transform: {
    worker: {
      observability: {
        enabled: true,
      },
    },
  },
})

export const STORAGE_URL = new sst.Linkable('STORAGE_URL', {
  properties: { value: storageWorker.url.apply((url) => url!) },
})

if ($app.stage === 'production') {
  new cloudflare.WorkersRoute('StorageWorkerRoute', {
    zoneId: secret.CLOUDFLARE_ZONE_ID.value,
    pattern: `storage.${domain}/*`,
    script: storageWorker.nodes.worker.scriptName,
  })
}
