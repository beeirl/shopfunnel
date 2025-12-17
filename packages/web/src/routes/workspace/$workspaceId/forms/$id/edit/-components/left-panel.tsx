import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Resizable } from '@/components/ui/resizable'
import { blockRegistry } from '@/form/block/registry'
import { cn } from '@/lib/utils'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { Block, Page } from '@shopfunnel/core/form/schema'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import { AddBlockDialog } from './add-block-dialog'
import { Pane } from './pane'
import { Panel } from './panel'

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
      className={cn('group flex cursor-grab flex-col rounded-lg border border-b bg-background')}
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
              <Button size="icon-sm" variant="ghost">
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

function BlockItem({
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
        'bg-backround flex h-9 cursor-grab items-center gap-2.5 rounded-lg border border-border px-2.5 transition-all hover:bg-accent',
        selected && 'bg-muted',
      )}
      onClick={onSelect}
    >
      <IconComponent className="size-4 text-muted-foreground" />
      <span className="flex-1 truncate text-xm font-medium">{item.name}</span>
    </div>
  )
}

export function LeftPanel({
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
}: {
  pages: Page[]
  selectedPageId: string | null
  onPageSelect: (pageId: string) => void
  onPagesReorder: (pages: Page[]) => void
  onPageAdd: () => void
  onPageDelete: (pageId: string) => void

  selectedBlockId: string | null
  onBlockSelect: (blockId: string | null) => void
  onBlocksReorder: (blocks: Block[]) => void
  onBlockAdd: (block: Block) => void
}) {
  const selectedPage = pages.find((p) => p.id === selectedPageId)
  const blocks = selectedPage?.blocks ?? []
  return (
    <Panel.Root className="w-[250px]">
      {selectedPageId ? (
        <Resizable.PanelGroup direction="vertical">
          <Resizable.Panel defaultSize={40} minSize={20}>
            <div className="flex flex-1 flex-col">
              <Panel.Header>
                <Panel.Title>Pages</Panel.Title>
                <Button className="-mr-2" size="icon-sm" variant="ghost" onClick={onPageAdd}>
                  <PlusIcon />
                </Button>
              </Panel.Header>
              <Panel.Content className="flex-1 overflow-y-auto">
                <DragDropProvider
                  onDragEnd={(event) => {
                    onPagesReorder(move(pages, event))
                  }}
                >
                  <div className="flex flex-col gap-1.5 py-3.5">
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
                  </div>
                </DragDropProvider>
              </Panel.Content>
            </div>
          </Resizable.Panel>
          <Resizable.Handle />
          <Resizable.Panel defaultSize={60} minSize={20}>
            <div className="flex flex-1 flex-col">
              <Panel.Header>
                <Panel.Title>Blocks</Panel.Title>
                <AddBlockDialog.Root onBlockAdd={onBlockAdd}>
                  <AddBlockDialog.Trigger render={<Button className="-mr-2" size="icon-sm" variant="ghost" />}>
                    <PlusIcon />
                  </AddBlockDialog.Trigger>
                  <AddBlockDialog.Popup />
                </AddBlockDialog.Root>
              </Panel.Header>
              <Panel.Content className="flex-1 overflow-y-auto">
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
                    <div className="flex flex-col gap-1.5 py-3.5">
                      {blocks.map((block, index) => (
                        <BlockItem
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
              </Panel.Content>
            </div>
          </Resizable.Panel>
        </Resizable.PanelGroup>
      ) : (
        <div className="flex h-full flex-col">
          <Panel.Header>
            <Pane.Title>Pages</Pane.Title>
            <Button className="-mr-2" size="icon-sm" variant="ghost" onClick={onPageAdd}>
              <PlusIcon />
            </Button>
          </Panel.Header>
          <Panel.Content className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-sm text-muted-foreground">No pages yet</span>
            </div>
          </Panel.Content>
        </div>
      )}
    </Panel.Root>
  )
}
