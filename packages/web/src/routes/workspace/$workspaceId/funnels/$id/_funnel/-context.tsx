import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import type { Settings } from '@shopfunnel/core/funnel/types'
import { debounceStrategy, eq } from '@tanstack/db'
import { usePacedMutations } from '@tanstack/react-db'
import { useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { type getFunnelVariantDraft, getFunnelVariantDraftQueryOptions, updateFunnel } from '../-common'
import type { FunnelCollection } from './-common'

type FunnelData = NonNullable<Awaited<ReturnType<typeof getFunnelVariantDraft>>>

export const uploadFunnelFile = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error('Expected FormData')
    }
    const file = input.get('file') as File
    const workspaceId = input.get('workspaceId') as string
    const funnelId = input.get('funnelId') as string

    if (!file || !workspaceId || !funnelId) {
      throw new Error('Missing required fields')
    }

    return { file, workspaceId, funnelId }
  })
  .handler(async ({ data }) => {
    const arrayBuffer = await data.file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return withActor(async () => {
      const result = await Funnel.createFile({
        funnelId: data.funnelId,
        contentType: data.file.type,
        data: buffer,
        name: data.file.name,
        size: data.file.size,
      })
      return result.url
    }, data.workspaceId)
  })

export type SaveFunnelInput = Partial<Pick<FunnelData, 'pages' | 'rules' | 'theme' | 'title'> & { settings: Settings }>

interface FunnelContextValue {
  data: FunnelData
  isSaving: boolean
  save: (input: SaveFunnelInput) => void
  maybeSave: (input: SaveFunnelInput) => void
  uploadFile: (file: File) => Promise<string>
}

const FunnelContext = React.createContext<FunnelContextValue | null>(null)

export function useFunnel() {
  const context = React.use(FunnelContext)
  if (!context) throw new Error('useFunnel must be used within FunnelProvider')
  return context
}

interface FunnelProviderProps {
  children: React.ReactNode
  collection: FunnelCollection
  activeVariantId: string
}

export function FunnelProvider({ children, collection, activeVariantId }: FunnelProviderProps) {
  const queryClient = useQueryClient()
  const [funnel, setFunnel] = React.useState<FunnelData | null>(() => collection.get(activeVariantId) ?? null)

  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    const subscription = collection.subscribeChanges(
      () => {
        setFunnel(collection.get(activeVariantId) ?? null)
      },
      {
        includeInitialState: true,
        where: (row) => eq(row.variantId, activeVariantId),
      },
    )

    return () => subscription.unsubscribe()
  }, [collection, activeVariantId])

  const mutate = usePacedMutations<SaveFunnelInput, FunnelData>({
    onMutate: (values) => {
      setIsSaving(true)
      collection.update(activeVariantId, (funnel) => {
        if (values.pages) funnel.pages = values.pages
        if (values.rules) funnel.rules = values.rules
        if (values.theme) funnel.theme = values.theme
        if (values.title) funnel.title = values.title
        if (values.settings) funnel.settings = values.settings
        funnel.canPublish = true
      })
    },
    mutationFn: async ({ transaction }) => {
      const mutation = transaction.mutations.find((m) => m.type === 'update')
      if (mutation) {
        const original = mutation.original as FunnelData
        await updateFunnel({
          data: {
            funnelId: original.id,
            funnelVariantId: original.variantId,
            workspaceId: original.workspaceId,
            ...(mutation.changes.pages && { pages: mutation.changes.pages }),
            ...(mutation.changes.rules && { rules: mutation.changes.rules }),
            ...(mutation.changes.theme && { theme: mutation.changes.theme }),
            ...(mutation.changes.title && { title: mutation.changes.title }),
            ...(mutation.changes.settings && { settings: mutation.changes.settings as Settings }),
          },
        })
        await queryClient.invalidateQueries({
          ...getFunnelVariantDraftQueryOptions({
            workspaceId: original.workspaceId,
            funnelId: original.id,
            funnelVariantId: original.variantId,
          }),
          exact: true,
        })
      }
      setFunnel(collection.get(activeVariantId) ?? null)
      setIsSaving(false)
    },
    strategy: debounceStrategy({ wait: 3000 }),
  })

  const save = React.useCallback(
    async (input: SaveFunnelInput) => {
      setIsSaving(true)
      const tx = collection.update(activeVariantId, (draft) => {
        if (input.pages) draft.pages = input.pages
        if (input.rules) draft.rules = input.rules
        if (input.theme) draft.theme = input.theme
        if (input.title) draft.title = input.title
        if (input.settings) draft.settings = input.settings
      })
      await tx.isPersisted.promise
      const current = collection.get(activeVariantId) as FunnelData
      await queryClient.invalidateQueries({
        ...getFunnelVariantDraftQueryOptions({
          workspaceId: current.workspaceId,
          funnelId: current.id,
          funnelVariantId: current.variantId,
        }),
        exact: true,
      })
      setFunnel(collection.get(activeVariantId) ?? null)
      setIsSaving(false)
    },
    [collection, activeVariantId, queryClient],
  )

  const maybeSave = React.useCallback(
    (input: SaveFunnelInput) => {
      mutate(input)
      setFunnel(collection.get(activeVariantId) ?? null)
    },
    [mutate, collection, activeVariantId],
  )

  const uploadFile = React.useCallback(
    (file: File) => {
      if (!funnel) throw new Error('Funnel not loaded')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspaceId', funnel.workspaceId)
      formData.append('funnelId', funnel.id)
      return uploadFunnelFile({ data: formData })
    },
    [funnel?.workspaceId, funnel?.id],
  )

  const value = React.useMemo<FunnelContextValue>(
    () => ({
      data: funnel!,
      isSaving,
      save,
      maybeSave,
      uploadFile,
    }),
    [funnel, isSaving, save, maybeSave, uploadFile],
  )

  if (!funnel) return null

  return <FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>
}
