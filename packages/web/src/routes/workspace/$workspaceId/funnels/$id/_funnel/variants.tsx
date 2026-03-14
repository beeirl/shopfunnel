import { DataGrid } from '@/components/data-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Menu } from '@/components/ui/menu'
import { withActor } from '@/context/auth.withActor'
import { snackbar } from '@/lib/snackbar'
import { getSessionQueryOptions } from '@/routes/workspace/$workspaceId/-common'
import { Heading } from '@/routes/workspace/$workspaceId/_dashboard/-components/heading'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconDots as DotsIcon,
  IconLink as LinkIcon,
  IconPencil as PencilIcon,
  IconPlus as PlusIcon,
  IconStarFilled as StarFilledIcon,
  IconStar as StarIcon,
} from '@tabler/icons-react'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { formatDistanceToNow } from 'date-fns'
import * as React from 'react'
import { z } from 'zod'
import { listVariantsQueryOptions } from '../-common'
import { VariantCreateDialog } from './-variant-create-dialog'

const setMainVariantFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () => Funnel.setMainVariant({ funnelId: data.funnelId, funnelVariantId: data.funnelVariantId }),
      data.workspaceId,
    )
  })

const renameVariantFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
      title: z.string().min(1).max(255),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Funnel.updateVariantName({
          funnelId: data.funnelId,
          funnelVariantId: data.funnelVariantId,
          title: data.title,
        }),
      data.workspaceId,
    )
  })

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/variants')({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const session = await context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId))
    if (!session.isAdmin) {
      throw redirect({ to: '/workspace/$workspaceId/funnels/$id/responses', params })
    }
  },
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
    )
  },
})

type VariantRenamePayload = { id: string; title: string }
type VariantRenameHandle = ReturnType<typeof Dialog.createHandle<VariantRenamePayload>>

function VariantRenameDialog({ handle }: { handle: VariantRenameHandle }) {
  return (
    <Dialog.Root handle={handle}>
      {({ payload }) => (payload ? <VariantRenameDialogContent handle={handle} payload={payload} /> : null)}
    </Dialog.Root>
  )
}

VariantRenameDialog.createHandle = Dialog.createHandle<VariantRenamePayload>

function VariantRenameDialogContent({
  handle,
  payload,
}: {
  handle: VariantRenameHandle
  payload: VariantRenamePayload
}) {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const [value, setValue] = React.useState(payload.title)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setValue(payload.title)
    setError(null)
  }, [payload.id])

  const renameMutation = useMutation({
    mutationFn: (data: { funnelVariantId: string; title: string }) =>
      renameVariantFn({
        data: {
          workspaceId: params.workspaceId,
          funnelId: params.id,
          funnelVariantId: data.funnelVariantId,
          title: data.title,
        },
      }),
    onSuccess: () => {
      handle.close()
      queryClient.invalidateQueries(listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }))
    },
  })

  const handleSave = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Name cannot be empty')
      return
    }
    renameMutation.mutate({ funnelVariantId: payload.id, title: trimmed })
  }

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Rename variant</Dialog.Title>
      </Dialog.Header>
      <Field.Root data-invalid={!!error}>
        <Input
          autoFocus
          placeholder="Enter variant name"
          value={value}
          onValueChange={(value) => {
            setValue(value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
        />
        <Field.Error>{error}</Field.Error>
      </Field.Root>
      <Dialog.Footer>
        <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
        <Button onClick={handleSave} disabled={renameMutation.isPending}>
          Save
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  )
}

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const variantsQuery = useSuspenseQuery(
    listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
  )
  const variants = variantsQuery.data

  const setMainMutation = useMutation({
    mutationFn: (funnelVariantId: string) =>
      setMainVariantFn({
        data: {
          workspaceId: params.workspaceId,
          funnelId: params.id,
          funnelVariantId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }))
    },
  })

  const [variantCreateHandle] = React.useState(() => VariantCreateDialog.createHandle())
  const [variantRenameHandle] = React.useState(() => VariantRenameDialog.createHandle())

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    snackbar.add({ title: 'Link copied to clipboard', type: 'success' })
  }

  return (
    <div className="p-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>Variants</Heading.Title>
          </Heading.Content>
          <Heading.Actions>
            <Dialog.Trigger handle={variantCreateHandle} render={<Button />}>
              <PlusIcon />
              Create variant
            </Dialog.Trigger>
          </Heading.Actions>
        </Heading.Root>

        <DataGrid.Root className="grid-cols-[auto_min-content] md:grid-cols-[auto_auto_auto_min-content]">
          <DataGrid.Header>
            <DataGrid.Head>Title</DataGrid.Head>
            <DataGrid.Head hideOnMobile>Traffic Split</DataGrid.Head>
            <DataGrid.Head hideOnMobile>Updated</DataGrid.Head>
            <DataGrid.Head srOnly>Actions</DataGrid.Head>
          </DataGrid.Header>
          <DataGrid.Body>
            {variants.map((variant) => (
              <DataGrid.Row key={variant.id}>
                <DataGrid.Cell>
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{variant.title}</span>
                    {variant.isMain && <StarFilledIcon className="size-3.5 shrink-0 text-amber-500" />}
                  </span>
                </DataGrid.Cell>
                <DataGrid.Cell hideOnMobile>
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground tabular-nums">{variant.trafficPercentage}%</span>
                    {variant.trafficPercentage > 0 && (
                      <Badge className="shrink-0 border-transparent bg-green-100 text-xs text-green-950">Live</Badge>
                    )}
                  </span>
                </DataGrid.Cell>
                <DataGrid.Cell hideOnMobile>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(variant.updatedAt, { addSuffix: true })}
                  </span>
                </DataGrid.Cell>
                <DataGrid.Cell>
                  <Menu.Root>
                    <Menu.Trigger render={<Button size="icon-sm" variant="ghost" />}>
                      <DotsIcon className="text-muted-foreground" />
                    </Menu.Trigger>
                    <Menu.Content align="end">
                      <Menu.Item onClick={() => handleCopyLink(variant.url)}>
                        <LinkIcon />
                        Copy shareable link
                      </Menu.Item>
                      {!variant.isMain && (
                        <Menu.Item
                          disabled={setMainMutation.isPending}
                          onClick={() => setMainMutation.mutate(variant.id)}
                        >
                          <StarIcon />
                          Set as main
                        </Menu.Item>
                      )}
                      <Menu.Item
                        onClick={() => variantRenameHandle.openWithPayload({ id: variant.id, title: variant.title })}
                      >
                        <PencilIcon />
                        Rename
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Root>
                </DataGrid.Cell>
              </DataGrid.Row>
            ))}
          </DataGrid.Body>
        </DataGrid.Root>

        <VariantRenameDialog handle={variantRenameHandle} />
        <VariantCreateDialog handle={variantCreateHandle} />
      </div>
    </div>
  )
}
