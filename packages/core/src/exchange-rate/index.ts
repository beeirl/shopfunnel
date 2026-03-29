import { Resource } from '@shopfunnel/resource'

export namespace ExchangeRate {
  export async function get(currency: string): Promise<number> {
    const code = currency.toUpperCase()
    if (code === 'USD') return 1
    const rate = await Resource.ExchangeRateKv.get(`rate:${code}`)
    if (rate === null) throw new Error('Unsupported currency code')
    return JSON.parse(rate)
  }

  export async function set(currency: string, rate: number): Promise<void> {
    const code = currency.toUpperCase()
    await Resource.ExchangeRateKv.put(`rate:${code}`, JSON.stringify(rate))
  }
}
