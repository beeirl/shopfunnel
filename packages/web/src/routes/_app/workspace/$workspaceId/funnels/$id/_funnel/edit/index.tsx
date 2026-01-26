import { createFileRoute, redirect } from '@tanstack/react-router'
import * as React from 'react'
import { useFunnel } from '../-context'
import { getSessionQueryOptions } from '../../../../-common'
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
  const { data: funnel } = useFunnel()
  const { showThemePanel, showLogicPanel, selectedBlock, selectedPage, selectedBlockId, selectedPageId, save } =
    useFunnelEditor()

  // Handle keyboard shortcuts for delete
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (selectedBlockId) {
          event.preventDefault()
          const updatedPages = funnel.pages.map((page) => ({
            ...page,
            blocks: page.blocks.filter((block) => block.id !== selectedBlockId),
          }))
          save({ pages: updatedPages })
        } else if (selectedPageId) {
          event.preventDefault()
          const updatedPages = funnel.pages.filter((page) => page.id !== selectedPageId)
          save({ pages: updatedPages })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBlockId, selectedPageId, funnel.pages, save])

  const handleRemove = () => {
    if (selectedBlockId) {
      const updatedPages = funnel.pages.map((page) => ({
        ...page,
        blocks: page.blocks.filter((block) => block.id !== selectedBlockId),
      }))
      save({ pages: updatedPages })
    } else if (selectedPageId) {
      const updatedPages = funnel.pages.filter((page) => page.id !== selectedPageId)
      save({ pages: updatedPages })
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--dashboard-header-height))]">
      <PagesPanel />
      <Canvas />

      {showLogicPanel && selectedPage ? (
        <LogicPanel />
      ) : showThemePanel ? (
        <ThemePanel />
      ) : selectedBlock ? (
        <BlockPanel onRemove={handleRemove} />
      ) : selectedPage ? (
        <PagePanel onRemove={handleRemove} />
      ) : null}
    </div>
  )
}
