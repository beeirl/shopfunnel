import { auth } from './auth'
import { database } from './database'
import { allSecrets } from './secret'
import { domain } from './stage'
import { storage, storageWorker } from './storage'

export const web = new sst.cloudflare.x.SolidStart('Web', {
  path: 'packages/web',
  domain,
  link: [database, storage, storageWorker, ...allSecrets],
  environment: {
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
