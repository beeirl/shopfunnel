import { Form } from '@/components/form'
import { withActor } from '@/context/auth.withActor'
import { Form as FormCore } from '@shopfunnel/core/form/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const getForm = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      formId: Identifier.schema('form'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const form = await FormCore.getCurrentVersion(data.formId)
      if (!form) throw notFound()
      return form
    }, data.workspaceId)
  })

const getFormQueryOptions = (workspaceId: string, formId: string) =>
  queryOptions({
    queryKey: ['form', workspaceId, formId],
    queryFn: () => getForm({ data: { workspaceId, formId } }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/forms/$id/preview/')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getFormQueryOptions(params.workspaceId, params.id))
  },
})

function RouteComponent() {
  const params = Route.useParams()

  const formQuery = useSuspenseQuery(getFormQueryOptions(params.workspaceId, params.id))
  const form = formQuery.data

  return (
    <div className="flex min-h-dvh flex-col">
      <Form form={form} mode="preview" className="flex flex-1 flex-col" />
    </div>
  )
}
