import { Resource } from '@shopfunnel/resource'

const response = await fetch(`https://v6.exchangerate-api.com/v6/${Resource.EXCHANGE_RATE_API_KEY.value}/latest/USD`)

if (!response.ok) {
  console.error(`API request failed: ${response.status} ${response.statusText}`)
  process.exit(1)
}

const json = (await response.json()) as any

if (json.result !== 'success') {
  console.error(`API returned error: ${JSON.stringify(json)}`)
  process.exit(1)
}

const entries = Object.entries(json.conversion_rates) as [string, number][]

await Promise.all(entries.map(([code, rate]) => Resource.ExchangeRateKv.put(`rate:${code}`, JSON.stringify(rate))))

console.log(`Populated ${entries.length} exchange rates`)
