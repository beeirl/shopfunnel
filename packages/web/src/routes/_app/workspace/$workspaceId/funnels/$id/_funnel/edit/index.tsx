import { getSessionQueryOptions } from '@/routes/_app/workspace/$workspaceId/-common'
import { createFileRoute, redirect } from '@tanstack/react-router'
import * as React from 'react'
import { BlockPanel } from './-components/block-panel'
import { Canvas } from './-components/canvas'
import { LogicPanel } from './-components/logic-panel'
import { PagePanel } from './-components/page-panel'
import { PagesPanel } from './-components/pages-panel'
import { ThemePanel } from './-components/theme-panel'
import { FunnelEditorProvider, useFunnelEditor } from './-context'

export const Route = createFileRoute('/_app/workspace/$workspaceId/funnels/$id/_funnel/edit/')({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const session = await context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId))
    if (!session.isAdmin) {
      throw redirect({ to: '/workspace/$workspaceId/funnels/$id/insights', params })
    }
  },
})

function RouteComponent() {
  return (
    <FunnelEditorProvider>
      <FunnelEditorContent />
    </FunnelEditorProvider>
  )
}

function FunnelEditorContent() {
  const {
    showThemePanel,
    showLogicPanel,
    selectedBlock,
    selectedPage,
    selectedBlockId,
    selectedPageId,
    deletePage,
    deleteBlock,
    duplicatePage,
    duplicateBlock,
  } = useFunnelEditor()

  // Handle keyboard shortcuts for delete
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (selectedBlockId) {
          event.preventDefault()
          deleteBlock(selectedBlockId)
        } else if (selectedPageId) {
          event.preventDefault()
          deletePage(selectedPageId)
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
        event.preventDefault()
        if (selectedBlockId) {
          duplicateBlock(selectedBlockId)
        } else if (selectedPageId) {
          duplicatePage(selectedPageId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBlockId, selectedPageId, deletePage, deleteBlock, duplicatePage, duplicateBlock])

  return (
    <div className="flex h-[calc(100vh-var(--dashboard-header-height))]">
      <PagesPanel />
      <Canvas />

      {showLogicPanel && selectedPage ? (
        <LogicPanel />
      ) : showThemePanel ? (
        <ThemePanel />
      ) : selectedBlock ? (
        <BlockPanel />
      ) : selectedPage ? (
        <PagePanel />
      ) : null}
    </div>
  )
}
