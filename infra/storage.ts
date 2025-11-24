export const privateStorageBucket = new sst.cloudflare.Bucket('PrivateStorage')

export const publicStorageBucket = new sst.cloudflare.Bucket('PublicStorage')

new cloudflare.R2ManagedDomain('PublicStorageManagedDomain', {
  accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
  bucketName: publicStorageBucket.name,
  enabled: true,
}).domain

new cloudflare.R2BucketCors('PublicStorageBucketCors', {
  accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
  bucketName: publicStorageBucket.name,
  rules: [
    {
      allowed: {
        headers: ['*'],
        methods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        origins: ['http://localhost:5173'],
      },
    },
  ],
})
