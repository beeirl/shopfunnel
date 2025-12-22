import { Form as FormComponent } from '@/form'
import { Form } from '@shopfunnel/core/form/index'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const getForm = createServerFn()
  .inputValidator(z.object({ shortId: z.string().length(8) }))
  .handler(async ({ data }) => {
    // fromShortId returns undefined if form doesn't exist or has no published version
    const form = await Form.getPublishedVersion(data.shortId)
    if (!form) throw notFound()
    return form
  })

const getFormQueryOptions = (shortId: string) =>
  queryOptions({
    queryKey: ['form', 'public', shortId],
    queryFn: () => getForm({ data: { shortId } }),
  })

export const Route = createFileRoute('/(form)/f/$id')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getFormQueryOptions(params.id))
  },
})

function RouteComponent() {
  const params = Route.useParams()

  const formQuery = useSuspenseQuery(getFormQueryOptions(params.id))

  return (
    <div className="flex min-h-dvh flex-col">
      <FormComponent form={formQuery.data} />
    </div>
  )
}
