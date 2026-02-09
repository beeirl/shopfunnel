import { analyticsQueue } from './analytics'
import { auth } from './auth'
import { BILLING, STRIPE_WEBHOOK_SECRET } from './billing'
import { database } from './database'
import { allSecrets, secret } from './secret'
import { domain } from './stage'
import { storage, STORAGE_URL } from './storage'

const SESSION_SECRET = new sst.Secret('SESSION_SECRET')

// let logProcessor: sst.cloudflare.Worker | undefined
// if ($app.stage === 'production') {
//   logProcessor = new sst.cloudflare.Worker('LogProcessor', {
//     handler: 'packages/web/src/log-processor.ts',
//     link: [new sst.Secret('HONEYCOMB_API_KEY')],
//   })
// }

export const web = new sst.cloudflare.x.SolidStart('Web', {
  path: 'packages/web',
  domain,
  link: [
    analyticsQueue,
    database,
    storage,
    BILLING,
    STORAGE_URL,
    SESSION_SECRET,
    STRIPE_WEBHOOK_SECRET,
    ...($dev
      ? [
          new sst.Secret('CLOUDFLARE_API_TOKEN', process.env.CLOUDFLARE_API_TOKEN!),
          new sst.Secret('CLOUDFLARE_DEFAULT_ACCOUNT_ID', process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID!),
        ]
      : []),
    ...allSecrets,
  ],
  environment: {
    ...($dev && {
      DEV: 'true',
      VITE_DEV: 'true',
    }),
    WEB_DOMAIN: domain,
    VITE_DOMAIN: domain,
    VITE_STAGE: $app.stage,
    VITE_AUTH_URL: auth.url.apply((url) => url!),
    VITE_POSTHOG_API_KEY: secret.POSTHOG_API_KEY.value,
  },
  transform: {
    server: {
      transform: {
        worker: {
          placement: { mode: 'smart' },
          // tailConsumers: logProcessor ? [{ service: logProcessor.nodes.worker.scriptName }] : [],
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
