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
    password: process.env.SESSION_SECRET || '0'.repeat(32),
    name: 'auth',
    maxAge: 60 * 60 * 24 * 365,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },
  })
}

