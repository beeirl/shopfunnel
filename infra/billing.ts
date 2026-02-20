import { secret } from './secret'
import { domain } from './stage'

export const stripeWebhook = new stripe.WebhookEndpoint('StripeWebhookEndpoint', {
  url: $interpolate`https://${domain}/api/stripe/webhook`,
  enabledEvents: [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ],
})

export const STRIPE_WEBHOOK_SECRET = new sst.Linkable('STRIPE_WEBHOOK_SECRET', {
  properties: { value: stripeWebhook.secret },
})

// export const billingCron = new sst.cloudflare.Cron('BillingCron', {
//   job: {
//     handler: 'packages/function/src/billing.ts',
//     link: [database, secret.STRIPE_SECRET_KEY, secret.TINYBIRD_TOKEN],
//   },
//   schedules: ['5 * * * *'],
// })

if ($app.stage === 'production') {
  new cloudflare.DnsRecord('StripeDnsRecord', {
    zoneId: secret.CLOUDFLARE_ZONE_ID.value,
    name: 'billing',
    type: 'CNAME',
    content: 'hosted-checkout.stripecdn.com',
    ttl: 300,
  })

  new cloudflare.DnsRecord('StripeChallengeDnsRecord', {
    zoneId: secret.CLOUDFLARE_ZONE_ID.value,
    name: '_acme-challenge.billing',
    type: 'TXT',
    content: 'GwC3PTmTamgq2E6cmvDOw5P7rKXB_qPIx_Hko5aoCcs',
    ttl: 300,
  })
}

const standardProduct = new stripe.Product('StandardProduct', {
  name: 'Shopfunnel Standard',
})

const standardMonthlyPriceBase = {
  product: standardProduct.id,
  currency: 'usd',
  recurring: {
    interval: 'month',
    intervalCount: 1,
  },
}
const standard5KMonthlyPrice = new stripe.Price('Standard5KMonthlyPrice', {
  ...standardMonthlyPriceBase,
  unitAmount: 7400,
})
const standard25KMonthlyPrice = new stripe.Price('Standard25KMonthlyPrice', {
  ...standardMonthlyPriceBase,
  unitAmount: 24900,
})
const standard50KMonthlyPrice = new stripe.Price('Standard50KMonthlyPrice', {
  ...standardMonthlyPriceBase,
  unitAmount: 39900,
})
const standard100KMonthlyPrice = new stripe.Price('Standard100KMonthlyPrice', {
  ...standardMonthlyPriceBase,
  unitAmount: 69900,
})
const standard250KMonthlyPrice = new stripe.Price('Standard250KMonthlyPrice', {
  ...standardMonthlyPriceBase,
  unitAmount: 169900,
})
const standard500KMonthlyPrice = new stripe.Price('Standard500KMonthlyPrice', {
  ...standardMonthlyPriceBase,
  unitAmount: 349900,
})
const standard1MMonthlyPrice = new stripe.Price('Standard1MMonthlyPrice', {
  ...standardMonthlyPriceBase,
  unitAmount: 650000,
})
const standard2MMonthlyPrice = new stripe.Price('Standard2MMonthlyPrice', {
  ...standardMonthlyPriceBase,
  unitAmount: 1200000,
})

const standardYearlyPriceBase = {
  product: standardProduct.id,
  currency: 'usd',
  recurring: {
    interval: 'year',
    intervalCount: 1,
  },
}
const standard5KYearlyPrice = new stripe.Price('Standard5KYearlyPrice', {
  ...standardYearlyPriceBase,
  unitAmount: 74000,
})
const standard25KYearlyPrice = new stripe.Price('Standard25KYearlyPrice', {
  ...standardYearlyPriceBase,
  unitAmount: 249000,
})
const standard50KYearlyPrice = new stripe.Price('Standard50KYearlyPrice', {
  ...standardYearlyPriceBase,
  unitAmount: 399000,
})
const standard100KYearlyPrice = new stripe.Price('Standard100KYearlyPrice', {
  ...standardYearlyPriceBase,
  unitAmount: 699000,
})
const standard250KYearlyPrice = new stripe.Price('Standard250KYearlyPrice', {
  ...standardYearlyPriceBase,
  unitAmount: 1699000,
})
const standard500KYearlyPrice = new stripe.Price('Standard500KYearlyPrice', {
  ...standardYearlyPriceBase,
  unitAmount: 3499000,
})
const standard1MYearlyPrice = new stripe.Price('Standard1MYearlyPrice', {
  ...standardYearlyPriceBase,
  unitAmount: 6500000,
})
const standard2MYearlyPrice = new stripe.Price('Standard2MYearlyPrice', {
  ...standardYearlyPriceBase,
  unitAmount: 12000000,
})

const sessionMeter = new stripe.Meter('SessionMeter', {
  displayName: 'Sessions',
  eventName: 'sessions',
  defaultAggregation: { formula: 'sum' },
  customerMapping: {
    eventPayloadKey: 'stripe_customer_id',
    type: 'by_id',
  },
  valueSettings: {
    eventPayloadKey: 'value',
  },
})

const standardOveragePriceBase = {
  product: standardProduct.id,
  currency: 'usd',
  billingScheme: 'tiered',
  tiersMode: 'graduated',
  recurring: {
    interval: 'month',
    intervalCount: 1,
    usageType: 'metered',
    meter: sessionMeter.id,
  },
}
const standard5KOveragePrice = new stripe.Price('Standard5KOveragePrice', {
  ...standardOveragePriceBase,
  tiers: [
    { upTo: 5000, unitAmount: 0 },
    { upTo: -1, unitAmount: 3 },
  ],
})
const standard25KOveragePrice = new stripe.Price('Standard25KOveragePrice', {
  ...standardOveragePriceBase,
  tiers: [
    { upTo: 25000, unitAmount: 0 },
    { upTo: -1, unitAmount: 2 },
  ],
})
const standard50KOveragePrice = new stripe.Price('Standard50KOveragePrice', {
  ...standardOveragePriceBase,
  tiers: [
    { upTo: 50000, unitAmount: 0 },
    { upTo: -1, unitAmount: 2 },
  ],
})
const standard100KOveragePrice = new stripe.Price('Standard100KOveragePrice', {
  ...standardOveragePriceBase,
  tiers: [
    { upTo: 100000, unitAmount: 0 },
    { upTo: -1, unitAmount: 2 },
  ],
})
const standard250KOveragePrice = new stripe.Price('Standard250KOveragePrice', {
  ...standardOveragePriceBase,
  tiers: [
    { upTo: 250000, unitAmount: 0 },
    { upTo: -1, unitAmount: 2 },
  ],
})
const standard500KOveragePrice = new stripe.Price('Standard500KOveragePrice', {
  ...standardOveragePriceBase,
  tiers: [
    { upTo: 500000, unitAmount: 0 },
    { upTo: -1, unitAmount: 2 },
  ],
})
const standard1MOveragePrice = new stripe.Price('Standard1MOveragePrice', {
  ...standardOveragePriceBase,
  tiers: [
    { upTo: 1000000, unitAmount: 0 },
    { upTo: -1, unitAmount: 2 },
  ],
})
const standard2MOveragePrice = new stripe.Price('Standard2MOveragePrice', {
  ...standardOveragePriceBase,
  tiers: [
    { upTo: 2000000, unitAmount: 0 },
    { upTo: -1, unitAmount: 2 },
  ],
})

const managedServiceProduct = new stripe.Product('ManagedServiceProduct', {
  name: 'Shopfunnel Managed Service',
})

const managedServiceMonthlyPrice = new stripe.Price('ManagedServicePrice', {
  product: managedServiceProduct.id,
  currency: 'usd',
  unitAmount: 150000,
  recurring: {
    interval: 'month',
    intervalCount: 1,
  },
})

const managedServiceYearlyPrice = new stripe.Price('ManagedServiceYearlyPrice', {
  product: managedServiceProduct.id,
  currency: 'usd',
  unitAmount: 1800000,
  recurring: {
    interval: 'year',
    intervalCount: 1,
  },
})

export const BILLING = new sst.Linkable('BILLING', {
  properties: {
    standardProductId: standardProduct.id,
    meterId: sessionMeter.id,

    standard5KMonthlyPriceId: standard5KMonthlyPrice.id,
    standard25KMonthlyPriceId: standard25KMonthlyPrice.id,
    standard50KMonthlyPriceId: standard50KMonthlyPrice.id,
    standard100KMonthlyPriceId: standard100KMonthlyPrice.id,
    standard250KMonthlyPriceId: standard250KMonthlyPrice.id,
    standard500KMonthlyPriceId: standard500KMonthlyPrice.id,
    standard1MMonthlyPriceId: standard1MMonthlyPrice.id,
    standard2MMonthlyPriceId: standard2MMonthlyPrice.id,

    standard5KYearlyPriceId: standard5KYearlyPrice.id,
    standard25KYearlyPriceId: standard25KYearlyPrice.id,
    standard50KYearlyPriceId: standard50KYearlyPrice.id,
    standard100KYearlyPriceId: standard100KYearlyPrice.id,
    standard250KYearlyPriceId: standard250KYearlyPrice.id,
    standard500KYearlyPriceId: standard500KYearlyPrice.id,
    standard1MYearlyPriceId: standard1MYearlyPrice.id,
    standard2MYearlyPriceId: standard2MYearlyPrice.id,

    standard5KOveragePriceId: standard5KOveragePrice.id,
    standard25KOveragePriceId: standard25KOveragePrice.id,
    standard50KOveragePriceId: standard50KOveragePrice.id,
    standard100KOveragePriceId: standard100KOveragePrice.id,
    standard250KOveragePriceId: standard250KOveragePrice.id,
    standard500KOveragePriceId: standard500KOveragePrice.id,
    standard1MOveragePriceId: standard1MOveragePrice.id,
    standard2MOveragePriceId: standard2MOveragePrice.id,

    managedServiceProductId: managedServiceProduct.id,

    managedServiceMonthlyPriceId: managedServiceMonthlyPrice.id,
    managedServiceYearlyPriceId: managedServiceYearlyPrice.id,
  },
})
