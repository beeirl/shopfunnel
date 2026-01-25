import { AlertDialog } from '@/components/ui/alert-dialog'
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
  const { data: funnel, maybeSave } = useFunnel()
  const { showThemePanel, showLogicPanel, selectedBlock, selectedPage, selectedBlockId, selectedPageId } =
    useFunnelEditor()

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const deleteTarget = selectedBlockId ? 'block' : selectedPageId ? 'page' : null

  // Handle keyboard shortcuts for delete
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (selectedBlockId || selectedPageId) {
          event.preventDefault()
          setDeleteDialogOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBlockId, selectedPageId])

  const handleDeleteConfirm = () => {
    if (selectedBlockId) {
      // Delete block
      const updatedPages = funnel.pages.map((page) => ({
        ...page,
        blocks: page.blocks.filter((block) => block.id !== selectedBlockId),
      }))
      maybeSave({ pages: updatedPages })
    } else if (selectedPageId) {
      // Delete page
      const updatedPages = funnel.pages.filter((page) => page.id !== selectedPageId)
      maybeSave({ pages: updatedPages })
    }
    setDeleteDialogOpen(false)
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
        <BlockPanel onRemove={() => setDeleteDialogOpen(true)} />
      ) : selectedPage ? (
        <PagePanel onRemove={() => setDeleteDialogOpen(true)} />
      ) : null}

      <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>Remove {deleteTarget}?</AlertDialog.Title>
            <AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action variant="destructive" onClick={handleDeleteConfirm}>
              Remove
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  )
}
