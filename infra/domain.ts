import { secret } from './secret'

if ($app.stage === 'production') {
  new cloudflare.DnsRecord('FallbackOriginDnsRecord', {
    zoneId: secret.CLOUDFLARE_ZONE_ID.value,
    name: 'cname',
    type: 'AAAA',
    content: '100::',
    proxied: true,
    ttl: 1,
  })
}
