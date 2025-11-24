import { auth } from './auth'
import { database } from './database'
import { allSecrets } from './secret'
import { privateStorageBucket, publicStorageBucket } from './storage'

export const web = new sst.cloudflare.x.SolidStart('Web', {
  path: 'packages/web',
  link: [database, privateStorageBucket, publicStorageBucket, ...allSecrets],
  environment: {
    VITE_AUTH_URL: auth.url.apply((url) => url!),
  },
  transform: {
    server: {
      transform: {
        worker: {
          placement: { mode: 'smart' },
        },
      },
    },
  },
})
