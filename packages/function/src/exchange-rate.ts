import { Resource } from '@shopfunnel/resource'

export default {
  async scheduled() {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${Resource.EXCHANGE_RATE_API_KEY.value}/latest/USD`,
    )
    if (!response.ok) return
    const json = (await response.json()) as any
    if (json.result !== 'success') return
    await Promise.all(
      Object.entries(json.conversion_rates).map(([code, rate]) =>
        Resource.ExchangeRateKv.put(`rate:${code}`, JSON.stringify(rate)),
      ),
    )
  },
}
