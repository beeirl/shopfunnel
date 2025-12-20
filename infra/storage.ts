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
