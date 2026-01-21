import type { KVNamespace } from '@cloudflare/workers-types'
import { issuer } from '@openauthjs/openauth'
import { GoogleOidcProvider } from '@openauthjs/openauth/provider/google'
import { PasswordProvider } from '@openauthjs/openauth/provider/password'
import { CloudflareStorage } from '@openauthjs/openauth/storage/cloudflare'
import { createSubjects } from '@openauthjs/openauth/subject'
import { PasswordUI } from '@openauthjs/openauth/ui/password'
import { Account } from '@shopfunnel/core/account/index'
import { Actor } from '@shopfunnel/core/actor'
import { Resend } from '@shopfunnel/core/resend/index'
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
      theme: {
        title: 'Shopfunnel',
        logo: `${process.env.APP_URL}/shopfunnel-logo.svg`,
        favicon: `${process.env.APP_URL}/favicon.svg`,
        css: [
          "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');",
          "[data-component='logo'] { height: 1.625rem; }",
        ].join('\n'),
        font: {
          family: 'Inter, sans-serif',
        },
        background: {
          light: '#FFFFFF',
          dark: '#FFFFFF',
        },
        primary: {
          light: '#000000',
          dark: '#000000',
        },
        radius: 'lg',
      },
      providers: {
        google: GoogleOidcProvider({
          clientID: Resource.GOOGLE_CLIENT_ID.value,
          scopes: ['openid', 'email'],
        }),
        email: PasswordProvider(
          PasswordUI({
            sendCode: async (email, code) => {
              await Resend.sendEmail({
                from: 'Shopfunnel <auth@shopfunnel.com>',
                to: email,
                subject: `Shopfunnel Pin Code: ${code}`,
                body: `Your pin code is <strong>${code}</strong>.`,
              })
            },
          }),
        ),
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
        } else if (response.provider === 'email') {
          subject = response.email
          email = response.email
        } else {
          throw new Error('Unsupported provider')
        }

        if (!email) throw new Error('No email found')
        if (!subject) throw new Error('No subject found')

        const accountId = await Account.findOrCreate({
          email,
          provider: response.provider,
          subject,
        })

        await Actor.provide('account', { accountId, email }, async () => {
          await User.joinInvitedWorkspaces()
          const workspaces = await Account.workspaces()
          if (workspaces.length === 0) {
            if (process.env.APP_STAGE !== 'beeirl') throw new Error('Not allowed')
            await Workspace.create({ name: 'Default' })
          }
        })

        return ctx.subject('account', accountId, { accountId, email })
      },
    }).fetch(request, env, ctx)
    return result
  },
}
