import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { FormBlock, getFormBlockType, getFormBlockTypes } from '@/form/block'
import { cn } from '@/lib/utils'
import { Combobox } from '@base-ui/react/combobox'
import type { Block } from '@shopfunnel/core/form/types'
import { IconSearch as SearchIcon, IconSearchOff as SearchOffIcon } from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'

const ADD_BLOCK_DATA = {
  short_text: () => ({
    id: ulid(),
    type: 'short_text' as const,
    properties: {
      label: 'Your question here',
      placeholder: '',
    },
    validations: {
      required: false,
    },
  }),
  multiple_choice: () => ({
    id: ulid(),
    type: 'multiple_choice' as const,
    properties: {
      label: 'Your question here',
      choices: [{ id: ulid(), label: 'Choice 1' }],
    },
    validations: {
      required: false,
    },
  }),
  dropdown: () => ({
    id: ulid(),
    type: 'dropdown' as const,
    properties: {
      label: 'Your question here',
      options: [{ id: ulid(), label: 'Option 1' }],
    },
    validations: {
      required: false,
    },
  }),
  slider: () => ({
    id: ulid(),
    type: 'slider' as const,
    properties: {
      label: 'Your question here',
      minValue: 0,
      maxValue: 100,
      step: 1,
    },
  }),
  heading: () => ({
    id: ulid(),
    type: 'heading' as const,
    properties: {
      text: 'Your heading here',
    },
  }),
  paragraph: () => ({
    id: ulid(),
    type: 'paragraph' as const,
    properties: {
      text: 'Your text here',
    },
  }),
  gauge: () => ({
    id: ulid(),
    type: 'gauge' as const,
    properties: {
      value: '50',
      minValue: 0,
      maxValue: 100,
    },
  }),
  list: () => ({
    id: ulid(),
    type: 'list' as const,
    properties: {
      orientation: 'vertical' as const,
      textPlacement: 'right' as const,
      size: 'sm' as const,
      items: [{ id: ulid(), title: 'Item', media: { type: 'emoji' as const, value: '✓' } }],
    },
  }),
  progress: () => ({
    id: ulid(),
    type: 'progress' as const,
    properties: {},
  }),
  image: () => ({
    id: ulid(),
    type: 'image' as const,
    properties: {
      aspectRatio: '16/9' as const,
    },
  }),
}

const PREVIEW_BLOCK_DATA: Record<Block['type'], Block> = {
  short_text: {
    id: '',
    type: 'short_text',
    properties: {
      label: 'What is your name?',
      placeholder: 'Enter your name...',
    },
    validations: {},
  },
  multiple_choice: {
    id: '',
    type: 'multiple_choice',
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
    id: '',
    type: 'dropdown',
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
    id: '',
    type: 'slider',
    properties: {
      label: 'How satisfied are you?',
      minValue: 0,
      maxValue: 100,
      step: 1,
      defaultValue: 50,
    },
  },
  heading: {
    id: '',
    type: 'heading',
    properties: {
      text: 'Welcome to our form',
    },
  },
  paragraph: {
    id: '',
    type: 'paragraph',
    properties: {
      text: 'This is a paragraph block with some descriptive text.',
    },
  },
  gauge: {
    id: '',
    type: 'gauge',
    properties: {
      value: 5,
      minValue: 0,
      maxValue: 10,
    },
  },
  list: {
    id: '',
    type: 'list',
    properties: {
      orientation: 'vertical' as const,
      textPlacement: 'right' as const,
      size: 'sm' as const,
      items: [
        { id: '1', title: 'First item', media: { type: 'emoji' as const, value: '✓' } },
        { id: '2', title: 'Second item', media: { type: 'emoji' as const, value: '✓' } },
        { id: '3', title: 'Third item', media: { type: 'emoji' as const, value: '✓' } },
      ],
    },
  },
  progress: {
    id: '',
    type: 'progress',
    properties: {},
  },
  image: {
    id: '',
    type: 'image',
    properties: {
      aspectRatio: '16/9',
    },
  },
}

const AddBlockDialogContext = React.createContext<{
  onBlockAdd: (block: Block) => void
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
  onBlockAdd: (block: Block) => void
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

  const blocks = getFormBlockTypes().filter((b) => b.category === 'display')
  const blockTypeValues = blocks.map((b) => b.type)

  const [highlightedBlockType, setHighlightedBlockType] = React.useState<Block['type'] | undefined>(blockTypeValues[0])

  const handleBlockAdd = (type: Block['type']) => {
    onBlockAdd(ADD_BLOCK_DATA[type]() as Block)
    setOpen(false)
  }

  return (
    <Dialog.Content showCloseButton={false} className="max-w-2xl gap-0 p-0 sm:max-w-2xl">
      <Combobox.Root<Block['type']>
        inline
        autoHighlight
        highlightItemOnHover={false}
        items={blockTypeValues}
        onItemHighlighted={setHighlightedBlockType}
      >
        <div className="flex flex-col">
          <div className="relative flex h-12 shrink-0 items-center border-b border-border">
            <SearchIcon className="pointer-events-none absolute left-4.5 size-4 text-muted-foreground" />
            <Combobox.Input
              className="h-full flex-1 bg-transparent pl-10.5 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Find blocks..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && highlightedBlockType) {
                  handleBlockAdd(highlightedBlockType)
                }
              }}
            />
          </div>
          <div className="flex h-[650px] max-h-[calc(90vh-48px)]">
            <Combobox.List className="flex w-full flex-col gap-0.5 overflow-y-auto p-2 data-empty:hidden md:max-w-[250px] md:border-r md:border-border">
              {(type: Block['type']) => {
                const block = getFormBlockType(type)
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
                    <block.icon className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium">{block.name}</span>
                  </Combobox.Item>
                )
              }}
            </Combobox.List>
            {highlightedBlockType && (
              <div className="hidden flex-1 flex-col md:flex">
                <div className="flex flex-1 flex-col overflow-y-auto">
                  <div className="border-b border-border px-6 pt-5 pb-6">
                    <h2 className="mb-2 text-xl font-bold text-foreground">
                      {getFormBlockType(highlightedBlockType)?.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {getFormBlockType(highlightedBlockType)?.description}
                    </p>
                  </div>

                  <div className="flex-1 px-6 pt-5 pb-6">
                    <Badge variant="secondary" className="mb-4">
                      Preview
                    </Badge>
                    <FormBlock static block={PREVIEW_BLOCK_DATA[highlightedBlockType]} />
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
