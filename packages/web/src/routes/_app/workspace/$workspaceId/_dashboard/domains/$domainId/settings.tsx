import { DataGrid } from '@/components/data-grid'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Drawer } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { withActor } from '@/context/auth.withActor'
import { Domain } from '@shopfunnel/core/domain/index'
import { File } from '@shopfunnel/core/file/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconUpload as UploadIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { Heading } from '../../-components/heading'

const getDomain = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      domainId: Identifier.schema('domain'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const domain = await Domain.fromId(data.domainId)
      if (!domain) throw notFound()
      return domain
    }, data.workspaceId)
  })

const getDomainQueryOptions = (workspaceId: string, domainId: string) =>
  queryOptions({
    queryKey: ['domain', workspaceId, domainId],
    queryFn: () => getDomain({ data: { workspaceId, domainId } }),
  })

const getDomainSettings = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      domainId: Identifier.schema('domain'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      return Domain.getSettings(data.domainId)
    }, data.workspaceId)
  })

const getDomainSettingsQueryOptions = (workspaceId: string, domainId: string) =>
  queryOptions({
    queryKey: ['domain-settings', workspaceId, domainId],
    queryFn: () => getDomainSettings({ data: { workspaceId, domainId } }),
  })

const updateDomainSettings = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      domainId: Identifier.schema('domain'),
      faviconUrl: z.string().nullish(),
      faviconType: z.string().nullish(),
      customCode: z.string().nullish(),
      metaTitle: z.string().nullish(),
      metaDescription: z.string().nullish(),
      metaImageUrl: z.string().nullish(),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      return Domain.updateSettings({
        domainId: data.domainId,
        ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl }),
        ...(data.faviconType !== undefined && { faviconType: data.faviconType }),
        ...(data.customCode !== undefined && { customCode: data.customCode }),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        ...(data.metaImageUrl !== undefined && { metaImageUrl: data.metaImageUrl }),
      })
    }, data.workspaceId)
  })

const updateFavicon = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error('Expected FormData')
    }
    const file = input.get('file') as globalThis.File
    const workspaceId = input.get('workspaceId') as string
    const domainId = input.get('domainId') as string

    if (!file || !workspaceId || !domainId) {
      throw new Error('Missing required fields')
    }

    return { file, workspaceId, domainId }
  })
  .handler(async ({ data }) => {
    const arrayBuffer = await data.file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return withActor(async () => {
      const result = await File.create({
        name: data.file.name,
        data: buffer,
        size: data.file.size,
        contentType: data.file.type,
      })
      await Domain.updateSettings({
        domainId: data.domainId,
        faviconUrl: result.url,
        faviconType: data.file.type,
      })
    }, data.workspaceId)
  })

const updateImage = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error('Expected FormData')
    }
    const file = input.get('file') as globalThis.File
    const workspaceId = input.get('workspaceId') as string
    const domainId = input.get('domainId') as string

    if (!file || !workspaceId || !domainId) {
      throw new Error('Missing required fields')
    }

    return { file, workspaceId, domainId }
  })
  .handler(async ({ data }) => {
    const arrayBuffer = await data.file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return withActor(async () => {
      const result = await File.create({
        name: data.file.name,
        data: buffer,
        size: data.file.size,
        contentType: data.file.type,
      })
      await Domain.updateSettings({
        domainId: data.domainId,
        metaImageUrl: result.url,
      })
    }, data.workspaceId)
  })

export const Route = createFileRoute('/_app/workspace/$workspaceId/_dashboard/domains/$domainId/settings')({
  staticData: { title: 'Domain Settings' },
  component: DomainSettingsRoute,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getDomainQueryOptions(params.workspaceId, params.domainId)),
      context.queryClient.ensureQueryData(getDomainSettingsQueryOptions(params.workspaceId, params.domainId)),
    ])
  },
})

function MetaTitleSettingRow() {
  const params = Route.useParams()
  const queryClient = useQueryClient()
  const settings = useSuspenseQuery(getDomainSettingsQueryOptions(params.workspaceId, params.domainId)).data

  const updateSettingsMutation = useMutation({
    mutationFn: (metaTitle: string | null) =>
      updateDomainSettings({ data: { workspaceId: params.workspaceId, domainId: params.domainId, metaTitle } }),
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    const value = inputRef.current?.value || null
    await updateSettingsMutation.mutateAsync(value)
    await queryClient.invalidateQueries(getDomainSettingsQueryOptions(params.workspaceId, params.domainId))
    setDialogOpen(false)
  }

  return (
    <>
      <DataGrid.Row>
        <DataGrid.Cell className="flex-col items-start justify-center">
          <span className="text-sm font-medium text-foreground">Title</span>
          <span className="text-sm text-muted-foreground">
            {settings?.metaTitle || 'The page title shown in browser tabs and search results'}
          </span>
        </DataGrid.Cell>
        <DataGrid.Cell className="shrink-0 justify-end">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Update Title
          </Button>
        </DataGrid.Cell>
      </DataGrid.Row>
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Update Title</Dialog.Title>
            <Dialog.Description>The page title shown in browser tabs and search results</Dialog.Description>
          </Dialog.Header>
          <Input ref={inputRef} defaultValue={settings?.metaTitle ?? ''} />
          <Dialog.Footer>
            <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  )
}

function MetaDescriptionSettingRow() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const settings = useSuspenseQuery(getDomainSettingsQueryOptions(params.workspaceId, params.domainId)).data

  const updateSettingsMutation = useMutation({
    mutationFn: (metaDescription: string | null) =>
      updateDomainSettings({ data: { workspaceId: params.workspaceId, domainId: params.domainId, metaDescription } }),
  })

  const [open, setOpen] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSave = async () => {
    const value = textareaRef.current?.value || null
    await updateSettingsMutation.mutateAsync(value)
    await queryClient.invalidateQueries(getDomainSettingsQueryOptions(params.workspaceId, params.domainId))
    setOpen(false)
  }

  return (
    <>
      <DataGrid.Row>
        <DataGrid.Cell className="flex-col items-start justify-center">
          <span className="text-sm font-medium text-foreground">Description</span>
          <span className="text-sm text-muted-foreground">
            {settings?.metaDescription || 'The summary shown in search results and link previews'}
          </span>
        </DataGrid.Cell>
        <DataGrid.Cell className="shrink-0 justify-end">
          <Button variant="outline" onClick={() => setOpen(true)}>
            Update Description
          </Button>
        </DataGrid.Cell>
      </DataGrid.Row>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Update Description</Dialog.Title>
            <Dialog.Description>The summary shown in search results and link previews</Dialog.Description>
          </Dialog.Header>
          <Textarea className="resize-none" ref={textareaRef} defaultValue={settings?.metaDescription ?? ''} />
          <Dialog.Footer>
            <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  )
}

function FaviconSettingRow() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const settings = useSuspenseQuery(getDomainSettingsQueryOptions(params.workspaceId, params.domainId)).data

  const updateFaviconMutation = useMutation({
    mutationFn: async (file: globalThis.File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspaceId', params.workspaceId)
      formData.append('domainId', params.domainId)
      return updateFavicon({ data: formData })
    },
  })

  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    await updateFaviconMutation.mutateAsync(file)
    await queryClient.invalidateQueries(getDomainSettingsQueryOptions(params.workspaceId, params.domainId))
  }

  return (
    <DataGrid.Row>
      <DataGrid.Cell className="flex-col items-start justify-center">
        <span className="text-sm font-medium text-foreground">Favicon</span>
        <span className="text-sm text-muted-foreground">The small icon shown in browser tabs</span>
      </DataGrid.Cell>
      <DataGrid.Cell className="shrink-0 justify-end">
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={updateFaviconMutation.isPending}>
          {settings?.faviconUrl ? (
            <>
              <img src={settings.faviconUrl} alt="" className="size-5 rounded object-cover" />
              Favicon
            </>
          ) : (
            <>
              <UploadIcon className="size-4" />
              Upload Favicon
            </>
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
          onChange={handleChange}
          className="hidden"
        />
      </DataGrid.Cell>
    </DataGrid.Row>
  )
}

function MetaImageSettingRow() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const settings = useSuspenseQuery(getDomainSettingsQueryOptions(params.workspaceId, params.domainId)).data

  const updateImageMutation = useMutation({
    mutationFn: async (file: globalThis.File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspaceId', params.workspaceId)
      formData.append('domainId', params.domainId)
      return updateImage({ data: formData })
    },
  })

  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    await updateImageMutation.mutateAsync(file)
    await queryClient.invalidateQueries(getDomainSettingsQueryOptions(params.workspaceId, params.domainId))
  }

  return (
    <DataGrid.Row>
      <DataGrid.Cell className="flex-col items-start justify-center">
        <span className="text-sm font-medium text-foreground">Image</span>
        <span className="text-sm text-muted-foreground">Preview image shown when sharing links</span>
      </DataGrid.Cell>
      <DataGrid.Cell className="shrink-0 justify-end">
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={updateImageMutation.isPending}>
          {settings?.metaImageUrl ? (
            <>
              <img src={settings.metaImageUrl} alt="" className="size-5 rounded object-cover" />
              Image
            </>
          ) : (
            <>
              <UploadIcon className="size-4" />
              Upload Image
            </>
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          className="hidden"
        />
      </DataGrid.Cell>
    </DataGrid.Row>
  )
}

function CodeSettingRow() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const settings = useSuspenseQuery(getDomainSettingsQueryOptions(params.workspaceId, params.domainId)).data

  const updateSettingsMutation = useMutation({
    mutationFn: (customCode: string | null) =>
      updateDomainSettings({ data: { workspaceId: params.workspaceId, domainId: params.domainId, customCode } }),
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSave = async () => {
    const value = textareaRef.current?.value || null
    await updateSettingsMutation.mutateAsync(value)
    await queryClient.invalidateQueries(getDomainSettingsQueryOptions(params.workspaceId, params.domainId))
    setDialogOpen(false)
  }

  return (
    <>
      <DataGrid.Row>
        <DataGrid.Cell className="flex-col items-start justify-center">
          <span className="text-sm font-medium text-foreground">Code Injection</span>
          <span className="text-sm text-muted-foreground">Custom code injected into the funnel</span>
        </DataGrid.Cell>
        <DataGrid.Cell className="shrink-0 justify-end">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Edit Code
          </Button>
        </DataGrid.Cell>
      </DataGrid.Row>
      <Drawer.Root open={dialogOpen} onOpenChange={setDialogOpen} side="right">
        <Drawer.Content showCloseButton={false} className="max-w-md!">
          <Drawer.Header>
            <Drawer.Title>Edit Code</Drawer.Title>
            <Drawer.Description>Add custom code that will be injected into the funnel.</Drawer.Description>
          </Drawer.Header>
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent px-4 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            defaultValue={settings?.customCode ?? ''}
            placeholder="// Write your custom code here"
          />
          <Drawer.Footer>
            <Button disabled={updateSettingsMutation.isPending} onClick={handleSave}>
              Save
            </Button>
            <Drawer.Close render={<Button variant="outline">Close</Button>} />
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Root>
    </>
  )
}

function DomainSettingsRoute() {
  const params = Route.useParams()

  const domainQuery = useSuspenseQuery(getDomainQueryOptions(params.workspaceId, params.domainId))
  const domain = domainQuery.data

  return (
    <div className="flex h-full w-full max-w-6xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>{domain.hostname}</Heading.Title>
          <Heading.Description>Manage your domain settings.</Heading.Description>
        </Heading.Content>
      </Heading.Root>

      <DataGrid.Root className="grid-cols-[1fr_min-content]">
        <DataGrid.Body>
          <MetaTitleSettingRow />
          <MetaDescriptionSettingRow />
          <FaviconSettingRow />
          <MetaImageSettingRow />
          <CodeSettingRow />
        </DataGrid.Body>
      </DataGrid.Root>
    </div>
  )
}
