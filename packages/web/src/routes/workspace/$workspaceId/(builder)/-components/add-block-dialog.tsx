import { Block } from '@/block'
import { blockRegistry, blockTypes } from '@/block/registry'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { cn } from '@/utils/cn'
import { Combobox } from '@base-ui-components/react/combobox'
import type { Block as BlockData, BlockOfType, BlockType } from '@shopfunnel/core/funnel/schema'
import { IconSearch as SearchIcon, IconSearchOff as SearchOffIcon } from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'

// ============================================
// Block Defaults & Preview Data
// ============================================

const blockDefaults = {
  short_text: {
    properties: {
      label: 'Your question here',
      placeholder: '',
    },
    validations: {
      required: false,
    },
  },
  multiple_choice: {
    properties: {
      label: 'Your question here',
      choices: [], // Will be filled with a default choice at creation
    },
    validations: {
      required: false,
    },
  },
  dropdown: {
    properties: {
      label: 'Your question here',
      options: [], // Will be filled with a default option at creation
    },
    validations: {
      required: false,
    },
  },
  slider: {
    properties: {
      label: 'Your question here',
      minValue: 0,
      maxValue: 100,
      step: 1,
    },
  },
  heading: {
    properties: {
      text: 'Your heading here',
    },
  },
  paragraph: {
    properties: {
      text: 'Your text here',
    },
  },
  gauge: {
    properties: {
      value: '50',
      minValue: 0,
      maxValue: 100,
    },
  },
  list: {
    properties: {
      orientation: 'vertical' as const,
      textPlacement: 'right' as const,
      size: 'sm' as const,
      items: [], // Will be filled with a default item at creation
    },
  },
  progress: {},
} satisfies Record<BlockType, Omit<BlockData, 'id' | 'type'>>

const blockPreviews = {
  short_text: {
    properties: {
      label: 'What is your name?',
      placeholder: 'Enter your name...',
    },
    validations: {},
  },
  multiple_choice: {
    properties: {
      label: 'Where are you from?',
      choices: [
        { id: '1', label: 'United States' },
        { id: '2', label: 'Canada' },
        { id: '3', label: 'United Kingdom' },
      ],
    },
    validations: {},
  },
  dropdown: {
    properties: {
      label: 'Select your country',
      options: [
        { id: '1', label: 'United States' },
        { id: '2', label: 'Canada' },
        { id: '3', label: 'United Kingdom' },
      ],
    },
    validations: {},
  },
  slider: {
    properties: {
      label: 'How satisfied are you?',
      minValue: 0,
      maxValue: 100,
      step: 1,
      defaultValue: 50,
    },
  },
  heading: {
    properties: {
      text: 'Welcome to our form',
    },
  },
  paragraph: {
    properties: {
      text: 'This is a paragraph block with some descriptive text.',
    },
  },
  gauge: {
    properties: {
      value: '50',
      minValue: 0,
      maxValue: 100,
    },
  },
  list: {
    properties: {
      orientation: 'vertical' as const,
      textPlacement: 'right' as const,
      size: 'sm' as const,
      items: [
        { id: '1', title: 'First item', icon: 'check' },
        { id: '2', title: 'Second item', icon: 'check' },
        { id: '3', title: 'Third item', icon: 'check' },
      ],
    },
  },
  progress: {},
} satisfies Record<BlockType, Omit<BlockData, 'id' | 'type'>>

// ============================================
// Helper Functions
// ============================================

function createBlock<T extends BlockType>(type: T, id: string, generateId: () => string): BlockOfType<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaults = structuredClone(blockDefaults[type]) as any

  // Handle special cases that need generated IDs
  if (type === 'multiple_choice') {
    defaults.properties.choices = [{ id: generateId(), label: 'Choice 1' }]
  }

  if (type === 'dropdown') {
    defaults.properties.options = [{ id: generateId(), label: 'Option 1' }]
  }

  if (type === 'list') {
    defaults.properties.items = [{ id: generateId(), title: 'Item', icon: 'check' }]
  }

  return { id, type, ...defaults } as BlockOfType<T>
}

function getPreviewBlock<T extends BlockType>(type: T): BlockOfType<T> {
  return { id: `preview-${type}`, type, ...blockPreviews[type] } as unknown as BlockOfType<T>
}

// ============================================
// Add Block Dialog
// ============================================

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

  const [highlightedBlockType, setHighlightedBlockType] = React.useState<BlockType | undefined>(blockTypes[0])

  const handleBlockAdd = (type: BlockType) => {
    const block = createBlock(type, ulid(), ulid)
    onBlockAdd(block)
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
                const item = blockRegistry[type]
                const IconComponent = item.icon
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
                    <span className="flex-1 truncate text-sm font-medium">{item.name}</span>
                  </Combobox.Item>
                )
              }}
            </Combobox.List>
            {highlightedBlockType && (
              <div className="hidden flex-1 flex-col md:flex">
                <div className="flex flex-1 flex-col overflow-y-auto">
                  <div className="border-b border-border px-6 pt-5 pb-6">
                    <h2 className="mb-2 text-xl font-bold text-foreground">
                      {blockRegistry[highlightedBlockType].name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{blockRegistry[highlightedBlockType].description}</p>
                  </div>

                  <div className="flex-1 px-6 pt-5 pb-6">
                    <Badge variant="secondary" className="mb-4">
                      Preview
                    </Badge>
                    <Block mode="preview" block={getPreviewBlock(highlightedBlockType)} />
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
