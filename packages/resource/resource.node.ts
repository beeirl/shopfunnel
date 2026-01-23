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
          // @ts-ignore
          // prettier-ignore
          const accountId = process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID ?? ResourceBase.CLOUDFLARE_DEFAULT_ACCOUNT_ID.value
          const s3Client = new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com` })
          // @ts-ignore
          const bucketName = value.name as string
          return {
            put: async (key: string, data: Buffer | Uint8Array | string, options?: any) => {
              await s3Client.send(
                new PutObjectCommand({
                  Bucket: bucketName,
                  Key: key,
                  Body: data,
                  ContentType: options?.httpMetadata?.contentType,
                  CacheControl: options?.httpMetadata?.cacheControl,
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
        // cloudflare.Queue wrapped with Linkable.wrap
        if ((value.type as string) === 'cloudflare:index/queue:Queue' || 'queueId' in value) {
          // @ts-ignore
          const apiToken = process.env.CLOUDFLARE_API_TOKEN ?? ResourceBase.CLOUDFLARE_API_TOKEN.value
          // @ts-ignore
          const accountId = value.accountId ?? ResourceBase.CLOUDFLARE_DEFAULT_ACCOUNT_ID.value
          // @ts-ignore
          const queueId = value.queueId as string
          return {
            send: async (body: unknown) => {
              const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}/messages`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ body }),
                },
              )
              if (!response.ok) {
                throw new Error(`Failed to send message to queue: ${response.statusText}`)
              }
            },
            sendBatch: async (messages: { body: unknown }[]) => {
              const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}/messages/batch`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ messages }),
                },
              )
              if (!response.ok) {
                throw new Error(`Failed to send batch messages to queue: ${response.statusText}`)
              }
            },
          }
        }
        // @ts-ignore
        if (value.type === 'sst.cloudflare.Kv') {
          // @ts-ignore
          // prettier-ignore
          const apiToken = process.env.CLOUDFLARE_API_TOKEN ?? ResourceBase.CLOUDFLARE_API_TOKEN.value
          // @ts-ignore
          // prettier-ignore
          const accountId = process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID ?? ResourceBase.CLOUDFLARE_DEFAULT_ACCOUNT_ID.value
          const client = new Cloudflare({
            apiToken,
          })
          // @ts-ignore
          const namespaceId = value.namespaceId
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
