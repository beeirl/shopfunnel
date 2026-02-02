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

  new cloudflare.DnsRecord('WwwDnsRecord', {
    zoneId: secret.CLOUDFLARE_ZONE_ID.value,
    name: 'www',
    type: 'AAAA',
    content: '100::',
    proxied: true,
    ttl: 1,
  })

  new cloudflare.Ruleset('WwwRedirectRuleset', {
    zoneId: secret.CLOUDFLARE_ZONE_ID.value,
    name: 'Redirect www to root',
    kind: 'zone',
    phase: 'http_request_dynamic_redirect',
    rules: [
      {
        action: 'redirect',
        expression: '(http.host eq "www.shopfunnel.com")',
        actionParameters: {
          fromValue: {
            statusCode: 301,
            targetUrl: {
              expression: 'concat("https://shopfunnel.com", http.request.uri.path)',
            },
          },
        },
        description: 'Redirect www to root domain',
        enabled: true,
      },
    ],
  })
}
