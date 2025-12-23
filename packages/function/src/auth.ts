import type { KVNamespace } from '@cloudflare/workers-types'
import { issuer } from '@openauthjs/openauth'
import { GoogleOidcProvider } from '@openauthjs/openauth/provider/google'
import { CloudflareStorage } from '@openauthjs/openauth/storage/cloudflare'
import { createSubjects } from '@openauthjs/openauth/subject'
import { THEME_OPENAUTH } from '@openauthjs/openauth/ui/theme'
import { Account } from '@shopfunnel/core/account/index'
import { Actor } from '@shopfunnel/core/actor'
import { User } from '@shopfunnel/core/user/index'
import { Workspace } from '@shopfunnel/core/workspace/index'
import { Resource } from '@shopfunnel/resource'
import { z } from 'zod'

type Env = {
  AuthStorage: KVNamespace
}

export const subjects = createSubjects({
  account: z.object({
    accountId: z.string(),
    email: z.string(),
  }),
  user: z.object({
    userId: z.string(),
    workspaceId: z.string(),
  }),
})

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const result = await issuer({
      theme: THEME_OPENAUTH,
      providers: {
        google: GoogleOidcProvider({
          clientID: Resource.GOOGLE_CLIENT_ID.value,
          scopes: ['openid', 'email'],
        }),
      },
      storage: CloudflareStorage({
        // @ts-ignore
        namespace: env.AuthStorage,
      }),
      subjects,
      async success(ctx, response) {
        let subject: string | undefined
        let email: string | undefined

        if (response.provider === 'google') {
          if (!response.id?.email_verified) throw new Error('Google email not verified')
          subject = response.id.sub as string
          email = response.id.email as string
        } else {
          throw new Error('Unsupported provider')
        }

        if (!email) throw new Error('No email found')
        if (!subject) throw new Error('No subject found')

        if (!['christoph@5head.org', 'kaisternyen@gmail.com'].includes(email)) throw new Error('Not allowed')

        const accountId = await Account.findOrCreate({
          email,
          provider: response.provider,
          subject,
        })

        // Get workspace
        await Actor.provide('account', { accountId, email }, async () => {
          await User.joinInvitedWorkspaces()
          const workspaces = await Account.workspaces()
          if (workspaces.length === 0) {
            await Workspace.create({ name: 'Default' })
          }
        })
        return ctx.subject('account', accountId, { accountId, email })
      },
    }).fetch(request, env, ctx)
    return result
  },
}
