import { secret } from './secret'

export const exchangeRateKv = new sst.cloudflare.Kv('ExchangeRateKv')

export const exchangeRateCron = new sst.cloudflare.Cron('ExchangeRateCron', {
  job: {
    handler: 'packages/function/src/exchange-rate.ts',
    link: [exchangeRateKv, secret.EXCHANGE_RATE_API_KEY],
  },
  schedules: ['0 0,12 * * *'],
})
