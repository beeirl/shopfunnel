import { getBlockInfo } from '@/components/block'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { Block } from '@shopfunnel/core/form/types'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import { AddBlockDialog } from './add-block-dialog'
import { Pane } from './pane'

function BlockItem({
  data,
  index,
  selected,
  onSelect,
  onDelete,
}: {
  data: Block
  index: number
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const block = getBlockInfo(data.type)

  const { ref } = useSortable({ id: data.id, index })

  return (
    <div
      ref={ref}
      className={cn(
        'group flex h-9 cursor-grab items-center gap-2 rounded-lg border border-border bg-background pr-1 pl-2.5 transition-all hover:border-ring/50',
        selected && 'border-ring ring-2 ring-ring/50 hover:border-ring',
      )}
      onClick={onSelect}
    >
      <block.icon className="size-4 text-muted-foreground" />
      <span className="flex-1 truncate text-xm font-medium">{block.name}</span>
      <AlertDialog.Root>
        <AlertDialog.Trigger
          render={
            <Button
              className="opacity-0 group-hover:opacity-100"
              size="icon-sm"
              variant="ghost"
              onClick={(e) => e.stopPropagation()}
            >
              <TrashIcon />
            </Button>
          }
        />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>Delete block?</AlertDialog.Title>
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
  )
}

export function BlocksPane({
  blocks,
  selectedBlockId,
  onBlockSelect,
  onBlocksReorder,
  onBlockAdd,
  onBlockDelete,
}: {
  blocks: Block[]
  selectedBlockId: string | null
  onBlockSelect: (blockId: string | null) => void
  onBlocksReorder: (blocks: Block[]) => void
  onBlockAdd: (block: Block) => void
  onBlockDelete: (blockId: string) => void
}) {
  return (
    <Pane.Root className="h-full">
      <Pane.Header>
        <Pane.Title>Blocks</Pane.Title>
        <AddBlockDialog.Root onBlockAdd={onBlockAdd}>
          <AddBlockDialog.Trigger render={<Button className="-mr-2" size="icon" variant="ghost" />}>
            <PlusIcon />
          </AddBlockDialog.Trigger>
          <AddBlockDialog.Popup />
        </AddBlockDialog.Root>
      </Pane.Header>
      <Pane.Content>
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-sm text-muted-foreground">No blocks yet</span>
          </div>
        ) : (
          <DragDropProvider onDragEnd={(event) => onBlocksReorder(move(blocks, event))}>
            <Pane.Group className="flex flex-col gap-1.5">
              {blocks.map((block, index) => (
                <BlockItem
                  key={block.id}
                  data={block}
                  index={index}
                  selected={selectedBlockId === block.id}
                  onSelect={() => onBlockSelect(block.id)}
                  onDelete={() => onBlockDelete(block.id)}
                />
              ))}
            </Pane.Group>
          </DragDropProvider>
        )}
      </Pane.Content>
    </Pane.Root>
  )
}
