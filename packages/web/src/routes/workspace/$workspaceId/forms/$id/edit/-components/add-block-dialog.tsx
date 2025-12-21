import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Block, getBlock, getBlocks } from '@/form/block'
import { cn } from '@/lib/utils'
import { Combobox } from '@base-ui/react/combobox'
import type { Block as BlockData, BlockType } from '@shopfunnel/core/form/schema'
import { IconSearch as SearchIcon, IconSearchOff as SearchOffIcon } from '@tabler/icons-react'
import * as React from 'react'

const AddBlockDialogContext = React.createContext<{
  onBlockAdd: (block: BlockData) => void
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
} | null>(null)

function useAddBlockDialogContext() {
  const context = React.useContext(AddBlockDialogContext)
  if (!context) {
    throw new Error('AddBlockDialog components must be used within AddBlockDialog.Root')
  }
  return context
}

function AddBlockDialogRoot({
  children,
  onBlockAdd,
}: {
  children: React.ReactNode
  onBlockAdd: (block: BlockData) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <AddBlockDialogContext.Provider value={{ onBlockAdd, setOpen }}>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        {children}
      </Dialog.Root>
    </AddBlockDialogContext.Provider>
  )
}

function AddBlockDialogPopup() {
  const { onBlockAdd, setOpen } = useAddBlockDialogContext()

  const blocks = getBlocks()
  const blockTypes = blocks.map((b) => b.type)

  const [highlightedBlockType, setHighlightedBlockType] = React.useState<BlockType | undefined>(blockTypes[0])

  const handleBlockAdd = (type: BlockType) => {
    const block = getBlock(type)
    onBlockAdd(block.defaultSchema())
    setOpen(false)
  }

  return (
    <Dialog.Content showCloseButton={false} className="max-w-2xl gap-0 p-0 sm:max-w-2xl">
      <Combobox.Root<BlockType>
        inline
        autoHighlight
        highlightItemOnHover={false}
        items={blockTypes}
        onItemHighlighted={setHighlightedBlockType}
      >
        <div className="flex flex-col">
          <div className="relative flex h-12 shrink-0 items-center border-b border-border">
            <SearchIcon className="pointer-events-none absolute left-4.5 size-4 text-muted-foreground" />
            <Combobox.Input
              className="h-full flex-1 bg-transparent pl-10.5 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Find questions, input fields and layout options..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && highlightedBlockType) {
                  handleBlockAdd(highlightedBlockType)
                }
              }}
            />
          </div>
          <div className="flex h-[650px] max-h-[calc(90vh-48px)]">
            <Combobox.List className="flex w-full flex-col gap-0.5 overflow-y-auto p-2 data-empty:hidden md:max-w-[250px] md:border-r md:border-border">
              {(type: BlockType) => {
                const block = getBlock(type)
                if (!block) return null
                const IconComponent = block.icon
                return (
                  <Combobox.Item
                    key={type}
                    value={type}
                    onClick={() => {
                      setHighlightedBlockType(type)
                    }}
                    onDoubleClick={() => handleBlockAdd(type)}
                    className={cn(
                      'flex h-8 shrink-0 cursor-pointer items-center gap-2.5 rounded-md px-2.5 transition-colors outline-none',
                      'hover:bg-secondary',
                      highlightedBlockType === type && 'bg-secondary',
                    )}
                  >
                    <IconComponent className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium">{block.name}</span>
                  </Combobox.Item>
                )
              }}
            </Combobox.List>
            {highlightedBlockType && (
              <div className="hidden flex-1 flex-col md:flex">
                <div className="flex flex-1 flex-col overflow-y-auto">
                  <div className="border-b border-border px-6 pt-5 pb-6">
                    <h2 className="mb-2 text-xl font-bold text-foreground">{getBlock(highlightedBlockType)?.name}</h2>
                    <p className="text-sm text-muted-foreground">{getBlock(highlightedBlockType)?.description}</p>
                  </div>

                  <div className="flex-1 px-6 pt-5 pb-6">
                    <Badge variant="secondary" className="mb-4">
                      Preview
                    </Badge>
                    <Block mode="preview" schema={getBlock(highlightedBlockType)!.previewSchema} />
                  </div>
                </div>

                <div className="flex shrink-0 justify-end border-t border-border p-4">
                  <Button onClick={() => handleBlockAdd(highlightedBlockType)}>Add block</Button>
                </div>
              </div>
            )}
            <Combobox.Empty className="flex size-full overflow-y-auto empty:size-0">
              <Empty.Root className="m-auto shrink-0">
                <Empty.Header>
                  <Empty.Media variant="icon">
                    <SearchOffIcon />
                  </Empty.Media>
                  <Empty.Title>No results</Empty.Title>
                  <Empty.Description>
                    No content blocks match your search. Retry with a different keyword.
                  </Empty.Description>
                </Empty.Header>
              </Empty.Root>
            </Combobox.Empty>
          </div>
        </div>
      </Combobox.Root>
    </Dialog.Content>
  )
}

export const AddBlockDialog = {
  Root: AddBlockDialogRoot,
  Trigger: Dialog.Trigger,
  Popup: AddBlockDialogPopup,
}
