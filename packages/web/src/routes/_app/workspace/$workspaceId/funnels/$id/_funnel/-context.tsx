import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import type { Info } from '@shopfunnel/core/funnel/types'
import { debounceStrategy } from '@tanstack/db'
import { useLiveQuery, usePacedMutations } from '@tanstack/react-db'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { updateFunnel } from '../-common'
import { FunnelCollection } from './-common'

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

export type SaveFunnelInput = Partial<Pick<Info, 'pages' | 'rules' | 'theme' | 'title' | 'settings'>>

interface FunnelContextValue {
  data: Info
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
}

export function FunnelProvider({ children, collection }: FunnelProviderProps) {
  const funnelQuery = useLiveQuery((q) => q.from({ funnel: collection }))
  const funnel = funnelQuery.data?.[0]!

  const [isSaving, setIsSaving] = React.useState(false)

  // Debug: Log when useLiveQuery data changes
  React.useEffect(() => {
    console.log('[FunnelProvider] useLiveQuery data changed', {
      timestamp: Date.now(),
      funnelId: funnel?.id,
      // Log a hash of pages to detect changes without flooding console
      pagesLength: funnel?.pages?.length,
      firstPageBlocksLength: funnel?.pages?.[0]?.blocks?.length,
      // Sample some text content to track changes
      sampleContent: funnel?.pages?.flatMap((p) => p.blocks)?.find((b) => 'text' in (b.properties || {}))?.properties,
    })
  }, [funnel])

  const mutate = usePacedMutations<SaveFunnelInput, Info>({
    onMutate: (values) => {
      console.log('[FunnelProvider] onMutate START', {
        timestamp: Date.now(),
        valuesKeys: Object.keys(values),
        pagesChanged: !!values.pages,
        // Sample content being saved
        sampleContent: values.pages?.flatMap((p) => p.blocks)?.find((b) => 'text' in (b.properties || {}))?.properties,
      })
      setIsSaving(true)
      collection.update(funnel.id, (funnel) => {
        if (values.pages) funnel.pages = values.pages
        if (values.rules) funnel.rules = values.rules
        if (values.theme) funnel.theme = values.theme
        if (values.title) funnel.title = values.title
        if (values.settings) funnel.settings = values.settings
        funnel.draft = true
        funnel.published = false
      })
      console.log('[FunnelProvider] onMutate END', { timestamp: Date.now() })
    },
    mutationFn: async ({ transaction }) => {
      console.log('[FunnelProvider] mutationFn START', {
        timestamp: Date.now(),
        transactionId: transaction.id,
        transactionState: transaction.state,
        mutationCount: transaction.mutations.length,
      })
      const mutation = transaction.mutations.find((m) => m.type === 'update')
      if (mutation) {
        console.log('[FunnelProvider] calling updateFunnel API', { timestamp: Date.now() })
        await updateFunnel({
          data: {
            funnelId: funnel.id,
            workspaceId: funnel.workspaceId,
            ...(mutation.changes.pages && { pages: mutation.changes.pages }),
            ...(mutation.changes.rules && { rules: mutation.changes.rules }),
            ...(mutation.changes.theme && { theme: mutation.changes.theme }),
            ...(mutation.changes.title && { title: mutation.changes.title }),
            ...(mutation.changes.settings && { settings: mutation.changes.settings }),
          },
        })
        console.log('[FunnelProvider] updateFunnel API complete', { timestamp: Date.now() })
      }
      console.log('[FunnelProvider] calling refetch', { timestamp: Date.now() })
      await collection.utils.refetch()
      console.log('[FunnelProvider] refetch complete', { timestamp: Date.now() })
      setIsSaving(false)
      console.log('[FunnelProvider] mutationFn END', { timestamp: Date.now() })
    },
    strategy: debounceStrategy({ wait: 3000 }),
  })

  const save = React.useCallback(
    async (input: SaveFunnelInput) => {
      setIsSaving(true)
      const tx = collection.update(funnel.id, (draft) => {
        if (input.pages) draft.pages = input.pages
        if (input.rules) draft.rules = input.rules
        if (input.theme) draft.theme = input.theme
        if (input.title) draft.title = input.title
        if (input.settings) draft.settings = input.settings
        draft.published = false
      })
      await tx.isPersisted.promise
      setIsSaving(false)
    },
    [collection, funnel.id],
  )

  const maybeSave = React.useCallback(
    (input: SaveFunnelInput) => {
      mutate(input)
    },
    [mutate],
  )

  const uploadFile = React.useCallback(
    (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspaceId', funnel.workspaceId)
      formData.append('funnelId', funnel.id)
      return uploadFunnelFile({ data: formData })
    },
    [funnel.workspaceId, funnel.id],
  )

  const value = React.useMemo<FunnelContextValue>(
    () => ({
      data: funnel,
      isSaving,
      save,
      maybeSave,
      uploadFile,
    }),
    [funnel, isSaving, save, maybeSave, uploadFile],
  )

  return <FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>
}
