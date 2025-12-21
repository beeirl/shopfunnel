import { Button } from '@/components/ui/button'
import { getBlock } from '@/form/block'
import { cn } from '@/lib/utils'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { Block } from '@shopfunnel/core/form/schema'
import { IconPlus as PlusIcon } from '@tabler/icons-react'
import { AddBlockDialog } from './add-block-dialog'
import { Pane } from './pane'

function BlockItem({
  schema,
  index,
  selected,
  onSelect,
}: {
  schema: Block
  index: number
  selected: boolean
  onSelect: () => void
}) {
  const block = getBlock(schema.type)

  const { ref } = useSortable({ id: schema.id, index })

  return (
    <div
      ref={ref}
      className={cn(
        'bg-backround flex h-9 cursor-grab items-center gap-2.5 rounded-lg border border-border px-2.5 transition-all hover:bg-accent',
        selected && 'bg-muted',
      )}
      onClick={onSelect}
    >
      <block.icon className="size-4 text-muted-foreground" />
      <span className="flex-1 truncate text-xm font-medium">{block.name}</span>
    </div>
  )
}

export function BlocksPane({
  blockSchemas,
  selectedBlockId,
  onBlockSelect,
  onBlocksReorder,
  onBlockAdd,
}: {
  blockSchemas: Block[]
  selectedBlockId: string | null
  onBlockSelect: (blockId: string | null) => void
  onBlocksReorder: (blocks: Block[]) => void
  onBlockAdd: (block: Block) => void
}) {
  return (
    <Pane.Root className="h-full">
      <Pane.Header>
        <Pane.Title>Blocks</Pane.Title>
        <AddBlockDialog.Root onBlockAdd={onBlockAdd}>
          <AddBlockDialog.Trigger render={<Button className="-mr-2" size="icon-sm" variant="ghost" />}>
            <PlusIcon />
          </AddBlockDialog.Trigger>
          <AddBlockDialog.Popup />
        </AddBlockDialog.Root>
      </Pane.Header>
      <Pane.Content>
        {blockSchemas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-sm text-muted-foreground">No blocks yet</span>
          </div>
        ) : (
          <DragDropProvider onDragEnd={(event) => onBlocksReorder(move(blockSchemas, event))}>
            <Pane.Group className="flex flex-col gap-1.5">
              {blockSchemas.map((blockSchema, index) => (
                <BlockItem
                  key={blockSchema.id}
                  schema={blockSchema}
                  index={index}
                  selected={selectedBlockId === blockSchema.id}
                  onSelect={() => onBlockSelect(blockSchema.id)}
                />
              ))}
            </Pane.Group>
          </DragDropProvider>
        )}
      </Pane.Content>
    </Pane.Root>
  )
}
