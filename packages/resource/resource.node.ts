import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { KVNamespaceListOptions, KVNamespaceListResult, KVNamespacePutOptions } from '@cloudflare/workers-types'
import Cloudflare from 'cloudflare'
import { Resource as ResourceBase } from 'sst'

export const waitUntil = async (promise: Promise<any>) => {
  await promise
}

export const Resource = new Proxy(
  {},
  {
    get(_target, prop: keyof typeof ResourceBase) {
      const value = ResourceBase[prop]
      if ('type' in value) {
        // @ts-ignore
        if (value.type === 'sst.cloudflare.Bucket') {
          const accountId = ResourceBase.CLOUDFLARE_DEFAULT_ACCOUNT_ID.value
          const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: ResourceBase.CLOUDFLARE_R2_ACCESS_KEY_ID.value,
              secretAccessKey: ResourceBase.CLOUDFLARE_R2_SECRET_ACCESS_KEY.value,
            },
          })
          // @ts-ignore
          const bucketName = value.name as string
          return {
            put: async (
              key: string,
              data: Buffer | Uint8Array | string,
              options?: { httpMetadata?: { contentType?: string } },
            ) => {
              await s3Client.send(
                new PutObjectCommand({
                  Bucket: bucketName,
                  Key: key,
                  Body: data,
                  ContentType: options?.httpMetadata?.contentType,
                }),
              )
            },
            delete: async (key: string) => {
              await s3Client.send(
                new DeleteObjectCommand({
                  Bucket: bucketName,
                  Key: key,
                }),
              )
            },
          }
        }
        // @ts-ignore
        if (value.type === 'sst.cloudflare.Kv') {
          const client = new Cloudflare({
            apiToken: ResourceBase.CLOUDFLARE_API_TOKEN.value,
          })
          // @ts-ignore
          const namespaceId = value.namespaceId
          const accountId = ResourceBase.CLOUDFLARE_DEFAULT_ACCOUNT_ID.value
          return {
            get: (k: string | string[]) => {
              const isMulti = Array.isArray(k)
              return client.kv.namespaces
                .bulkGet(namespaceId, {
                  keys: Array.isArray(k) ? k : [k],
                  account_id: accountId,
                })
                .then((result) => (isMulti ? new Map(Object.entries(result?.values ?? {})) : result?.values?.[k]))
            },
            put: (k: string, v: string, opts?: KVNamespacePutOptions) =>
              client.kv.namespaces.values.update(namespaceId, k, {
                account_id: accountId,
                value: v,
                expiration: opts?.expiration,
                expiration_ttl: opts?.expirationTtl,
                metadata: opts?.metadata,
              }),
            delete: (k: string) =>
              client.kv.namespaces.values.delete(namespaceId, k, {
                account_id: accountId,
              }),
            list: (opts?: KVNamespaceListOptions): Promise<KVNamespaceListResult<unknown, string>> =>
              client.kv.namespaces.keys
                .list(namespaceId, {
                  account_id: accountId,
                  prefix: opts?.prefix ?? undefined,
                })
                .then((result) => {
                  return {
                    keys: result.result,
                    list_complete: true,
                    cacheStatus: null,
                  }
                }),
          }
        }
      }
      return value
    },
  },
) as Record<string, any>
