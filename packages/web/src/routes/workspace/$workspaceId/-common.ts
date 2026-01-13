import { withActor } from '@/context/auth.withActor'
import { Actor } from '@shopfunnel/core/actor'
import { Identifier } from '@shopfunnel/core/identifier'
import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'

export const getSession = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => {
      return {
        isAdmin: Actor.userRole() === 'admin',
      }
    }, workspaceId)
  })

export const getSessionQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['session', workspaceId],
    queryFn: () => getSession({ data: workspaceId }),
  })
