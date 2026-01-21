// prettier-ignore
export const secret = {
  CLOUDFLARE_ZONE_ID: new sst.Secret('CLOUDFLARE_ZONE_ID', process.env.CLOUDFLARE_ZONE_ID),
  CLOUDFLARE_R2_ACCESS_KEY_ID: new sst.Secret('CLOUDFLARE_R2_ACCESS_KEY_ID'),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: new sst.Secret('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
  CLOUDFLARE_SSL_API_TOKEN: new sst.Secret('CLOUDFLARE_SSL_API_TOKEN'),
  GOOGLE_CLIENT_ID: new sst.Secret('GOOGLE_CLIENT_ID'),
  SHOPIFY_CLIENT_ID: new sst.Secret('SHOPIFY_CLIENT_ID'),
  SHOPIFY_CLIENT_SECRET: new sst.Secret('SHOPIFY_CLIENT_SECRET'),
  TINYBIRD_TOKEN: new sst.Secret('TINYBIRD_TOKEN'),
}
export const allSecrets = Object.values(secret)
