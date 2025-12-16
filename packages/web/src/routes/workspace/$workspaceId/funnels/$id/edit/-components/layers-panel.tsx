import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Resizable } from '@/components/ui/resizable'
import { blockRegistry } from '@/funnel/block/registry'
import { cn } from '@/utils/cn'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { Block, Page } from '@shopfunnel/core/funnel/schema'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import { AddBlockDialog } from './add-block-dialog'
import { PaneContent, PaneHeader, PaneRoot, PaneTitle } from './pane'

function SortablePageItem({
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
        'group -mx-1.5 flex cursor-grab gap-3 rounded-xl p-2 pl-3 transition-all hover:bg-secondary',
        selected && 'bg-secondary',
      )}
    >
      <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
      <div className="relative flex aspect-video flex-1 items-start justify-start overflow-hidden rounded-lg border border-border bg-card p-3 transition-all active:scale-[1.02] active:cursor-grabbing">
        <div className="pointer-events-none flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-card-foreground">
            {page.blocks.length} {page.blocks.length === 1 ? 'block' : 'blocks'}
          </span>
          <span className="text-[10px] text-muted-foreground">Page {index + 1}</span>
        </div>
        <AlertDialog.Root>
          <AlertDialog.Trigger
            render={
              <Button
                size="icon-xs"
                variant="destructive"
                className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <TrashIcon />
          </AlertDialog.Trigger>
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

function SortableBlockItem({
  block,
  index,
  selected,
  onSelect,
}: {
  block: Block
  index: number
  selected: boolean
  onSelect: () => void
}) {
  const { ref } = useSortable({ id: block.id, index })
  const item = blockRegistry[block.type]
  const IconComponent = item.icon

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-8 cursor-grab items-center gap-2.5 rounded-md px-2.5 transition-all hover:bg-accent hover:text-accent-foreground',
        selected && 'bg-accent text-accent-foreground',
      )}
      onClick={onSelect}
    >
      <IconComponent className="size-4 text-muted-foreground" />
      <span className="flex-1 truncate text-sm font-medium">{item.name}</span>
    </div>
  )
}

interface LayersPanelProps {
  // Pages
  pages: Page[]
  selectedPageId: string | null
  onPageSelect: (pageId: string) => void
  onPagesReorder: (pages: Page[]) => void
  onPageAdd: () => void
  onPageDelete: (pageId: string) => void
  // Blocks
  selectedBlockId: string | null
  onBlockSelect: (blockId: string | null) => void
  onBlocksReorder: (blocks: Block[]) => void
  onBlockAdd: (block: Block) => void
}

export function LayersPanel({
  pages,
  selectedPageId,
  onPageSelect,
  onPagesReorder,
  onPageAdd,
  onPageDelete,
  selectedBlockId,
  onBlockSelect,
  onBlocksReorder,
  onBlockAdd,
}: LayersPanelProps) {
  const selectedPage = pages.find((p) => p.id === selectedPageId)
  const blocks = selectedPage?.blocks ?? []
  return (
    <div className="flex w-[250px] flex-col border-r border-border bg-background">
      {selectedPageId ? (
        <Resizable.PanelGroup direction="vertical">
          <Resizable.Panel defaultSize={40} minSize={10}>
            <PaneRoot className="flex h-full flex-col">
              <PaneHeader>
                <PaneTitle>Pages</PaneTitle>
                <Button className="-mr-2" size="icon-sm" variant="ghost" onClick={onPageAdd}>
                  <PlusIcon />
                </Button>
              </PaneHeader>
              <PaneContent className="flex-1 overflow-y-auto">
                <DragDropProvider
                  onDragEnd={(event) => {
                    onPagesReorder(move(pages, event))
                  }}
                >
                  <div className="flex flex-col gap-1">
                    {pages.map((page, index) => (
                      <SortablePageItem
                        key={page.id}
                        page={page}
                        index={index}
                        selected={selectedPageId === page.id}
                        onSelect={() => onPageSelect(page.id)}
                        onDelete={() => onPageDelete(page.id)}
                      />
                    ))}
                  </div>
                </DragDropProvider>
              </PaneContent>
            </PaneRoot>
          </Resizable.Panel>
          <Resizable.Handle />
          <Resizable.Panel defaultSize={60} minSize={10}>
            <PaneRoot className="flex h-full flex-col">
              <PaneHeader>
                <PaneTitle>Blocks</PaneTitle>
                <AddBlockDialog.Root onBlockAdd={onBlockAdd}>
                  <AddBlockDialog.Trigger render={<Button className="-mr-2" size="icon-sm" variant="ghost" />}>
                    <PlusIcon />
                  </AddBlockDialog.Trigger>
                  <AddBlockDialog.Popup />
                </AddBlockDialog.Root>
              </PaneHeader>
              <PaneContent className="flex-1 overflow-y-auto">
                {blocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <span className="text-sm text-muted-foreground">No blocks yet</span>
                  </div>
                ) : (
                  <DragDropProvider
                    onDragEnd={(event) => {
                      onBlocksReorder(move(blocks, event))
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      {blocks.map((block, index) => (
                        <SortableBlockItem
                          key={block.id}
                          block={block}
                          index={index}
                          selected={selectedBlockId === block.id}
                          onSelect={() => onBlockSelect(block.id)}
                        />
                      ))}
                    </div>
                  </DragDropProvider>
                )}
              </PaneContent>
            </PaneRoot>
          </Resizable.Panel>
        </Resizable.PanelGroup>
      ) : (
        <PaneRoot className="flex h-full flex-col">
          <PaneHeader>
            <PaneTitle>Pages</PaneTitle>
            <Button className="-mr-2" size="icon-sm" variant="ghost" onClick={onPageAdd}>
              <PlusIcon />
            </Button>
          </PaneHeader>
          <PaneContent className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-sm text-muted-foreground">No pages yet</span>
            </div>
          </PaneContent>
        </PaneRoot>
      )}
    </div>
  )
}
