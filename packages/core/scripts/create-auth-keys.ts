import { encryptionKeys, signingKeys } from '@openauthjs/openauth/keys'
import { MemoryStorage } from '@openauthjs/openauth/storage/memory'
import { Resource } from '@shopfunnel/resource'

const SEPARATOR = String.fromCharCode(0x1f)

const existingSigningKeys = await Resource.AuthStorage.list({ prefix: `signing:key${SEPARATOR}` })
const existingEncryptionKeys = await Resource.AuthStorage.list({ prefix: `encryption:key${SEPARATOR}` })

if (existingSigningKeys.keys.length > 0 && existingEncryptionKeys.keys.length > 0) {
  console.log('Keys already exist, skipping creation')
  process.exit(0)
}

const storage = MemoryStorage()

const [signing] = await signingKeys(storage)
const [encryption] = await encryptionKeys(storage)

const signingKey = `signing:key${SEPARATOR}${signing.id}`
const encryptionKey = `encryption:key${SEPARATOR}${encryption.id}`
const signingValue = await storage.get(['signing:key', signing.id])
const encryptionValue = await storage.get(['encryption:key', encryption.id])

await Resource.AuthStorage.put(signingKey, JSON.stringify(signingValue))
await Resource.AuthStorage.put(encryptionKey, JSON.stringify(encryptionValue))
