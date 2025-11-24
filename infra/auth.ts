import { database } from './database'
import { secret } from './secret'

const authStorage = new sst.cloudflare.Kv('AuthStorage')

export const auth = new sst.cloudflare.Worker('AuthApi', {
  handler: 'packages/function/src/auth.ts',
  url: true,
  link: [authStorage, database, secret.GOOGLE_CLIENT_ID],
})
