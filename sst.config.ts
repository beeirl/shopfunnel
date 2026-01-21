/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'shopfunnel',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'cloudflare',
      providers: {
        cloudflare: true,
        planetscale: true,
        random: true,
      },
    }
  },
  async run() {
    await import('./infra/auth')
    await import('./infra/database')
    await import('./infra/storage')
    await import('./infra/analytics')
    await import('./infra/domain')
    await import('./infra/web')
  },
})
