import { Resource } from '@shopfunnel/resource'
import { useSession } from '@tanstack/react-start/server'

export interface AuthSession {
  account?: Record<
    string,
    {
      id: string
      email: string
    }
  >
  current?: string
}

export function useAuthSession() {
  return useSession<AuthSession>({
    name: 'auth',
    password: Resource.SESSION_SECRET.value,
    maxAge: 60 * 60 * 24 * 365,
    cookie: {
      secure: !process.env.DEV,
      httpOnly: true,
    },
  })
}
