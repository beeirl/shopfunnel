import { createClient } from '@openauthjs/openauth/client'
import { Actor } from '@quizfunnel/core/actor'
import { useAuthSession } from './auth.session'

export const AuthClient = createClient({
  clientID: 'app',
  issuer: import.meta.env.VITE_AUTH_URL || 'https://auth.opencode.ai',
})

export async function getActor(workspace?: string): Promise<Actor.Info> {
  const auth = await useAuthSession()
  if (!workspace) {
    const account = auth.data.account ?? {}
    const current = account[auth.data.current ?? '']
    if (current) {
      return {
        type: 'account',
        properties: {
          email: current.email,
          accountID: current.id,
        },
      }
    }
    if (Object.keys(account).length > 0) {
      const current = Object.values(account)[0]
      await auth.update((val) => ({
        ...val,
        current: current.id,
      }))
      return {
        type: 'account',
        properties: {
          email: current.email,
          accountID: current.id,
        },
      }
    }
    return {
      type: 'public',
      properties: {},
    }
  }
  // TODO: Implement workspace-based actor resolution
  // This would require database access to check user membership
  throw new Error('Workspace-based actor resolution not yet implemented')
}
