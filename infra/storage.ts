import { secret } from './secret'
import { domain } from './stage'

export const storage = new sst.cloudflare.Bucket('Storage')

const storageDomain = new cloudflare.R2CustomDomain('StorageDomain', {
  accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
  enabled: true,
  bucketName: storage.name,
  domain: `storage.${domain}`,
  zoneId: secret.CLOUDFLARE_ZONE_ID.value,
})

new cloudflare.WorkersRoute('StorageWorkerRoute', {
  zoneId: secret.CLOUDFLARE_ZONE_ID.value,
  pattern: `storage.${domain}/*`,
})

export const STORAGE_URL = new sst.Linkable('STORAGE_URL', {
  properties: { value: storageDomain.domain.apply((domain) => `https://${domain}`) },
})
