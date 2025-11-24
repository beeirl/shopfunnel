// prettier-ignore

export const secret = {
  CLOUDFLARE_API_TOKEN: new sst.Secret('CLOUDFLARE_API_TOKEN', process.env.CLOUDFLARE_API_TOKEN),
  CLOUDFLARE_DEFAULT_ACCOUNT_ID: new sst.Secret('CLOUDFLARE_DEFAULT_ACCOUNT_ID', sst.cloudflare.DEFAULT_ACCOUNT_ID),
  DATABASE_USERNAME: new sst.Secret('DATABASE_USERNAME', process.env.DATABASE_USERNAME),
  DATABASE_PASSWORD: new sst.Secret('DATABASE_PASSWORD', process.env.DATABASE_PASSWORD),
  GOOGLE_CLIENT_ID: new sst.Secret('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID),
}
export const allSecrets = Object.values(secret)
