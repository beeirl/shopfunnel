import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { Page } from '@shopfunnel/core/form/types'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import { AddPageDialog } from './add-page-dialog'
import { Pane } from './pane'

function PageItem({
  page,
  index,
  selected,
  onSelect,
  onDelete,
}: {
  page: Page
  index: number
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const { ref } = useSortable({ id: page.id, index })

  return (
    <div
      ref={ref}
      onClick={onSelect}
      className={cn(
        'group flex cursor-grab flex-col rounded-lg border border-border bg-background transition-all hover:border-ring/50',
        selected && 'border-ring ring-3 ring-ring/50 hover:border-ring',
      )}
    >
      <div className="px-1 pt-1">
        <div className="flex aspect-video items-center justify-center rounded-md bg-muted">
          <span className="text-xs font-semibold text-card-foreground">
            {page.blocks.length} {page.blocks.length === 1 ? 'block' : 'blocks'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between px-2.5 py-1">
        <span className="text-xs">Page {index + 1}</span>
        <AlertDialog.Root>
          <AlertDialog.Trigger
            render={
              <Button className="opacity-0 group-hover:opacity-100" size="icon-sm" variant="ghost">
                <TrashIcon />
              </Button>
            }
          />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Title>Delete page?</AlertDialog.Title>
              <AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action variant="destructive" onClick={onDelete}>
                Delete
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
    </div>
  )
}

export function PagesPane({
  pages,
  selectedPageId,
  onPageSelect,
  onPagesReorder,
  onPageAdd,
  onPageDelete,
}: {
  pages: Page[]
  selectedPageId: string | null
  onPageSelect: (pageId: string) => void
  onPagesReorder: (pages: Page[]) => void
  onPageAdd: (page: Page) => void
  onPageDelete: (pageId: string) => void
}) {
  return (
    <Pane.Root className="h-full">
      <Pane.Header>
        <Pane.Title>Pages</Pane.Title>
        <AddPageDialog.Root onPageAdd={onPageAdd}>
          <AddPageDialog.Trigger render={<Button className="-mr-2" size="icon" variant="ghost" />}>
            <PlusIcon />
          </AddPageDialog.Trigger>
          <AddPageDialog.Popup />
        </AddPageDialog.Root>
      </Pane.Header>
      <Pane.Content>
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-sm text-muted-foreground">No pages yet</span>
          </div>
        ) : (
          <DragDropProvider onDragEnd={(event) => onPagesReorder(move(pages, event))}>
            <Pane.Group className="flex flex-col gap-2">
              {pages.map((page, index) => (
                <PageItem
                  key={page.id}
                  page={page}
                  index={index}
                  selected={selectedPageId === page.id}
                  onSelect={() => onPageSelect(page.id)}
                  onDelete={() => onPageDelete(page.id)}
                />
              ))}
            </Pane.Group>
          </DragDropProvider>
        )}
      </Pane.Content>
    </Pane.Root>
  )
}
