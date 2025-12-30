import { Block as BlockComponent } from '@/components/block'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import { Combobox } from '@base-ui/react/combobox'
import type { Block, Page } from '@shopfunnel/core/form/types'
import {
  IconChevronDown as ChevronDownIcon,
  IconFile as FileIcon,
  IconLayoutGrid as LayoutGridIcon,
  IconListLetters as ListLettersIcon,
  IconLoader as LoaderIcon,
  IconMenu as MenuIcon,
  IconSearch as SearchIcon,
  IconSearchOff as SearchOffIcon,
} from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'

const INPUT_BLOCK_TYPES = ['text_input', 'multiple_choice', 'picture_choice', 'dropdown']

const ADD_BLOCK_DATA = {
  heading: () => ({
    id: ulid(),
    type: 'heading' as const,
    properties: {
      text: 'Your question here',
      alignment: 'left' as const,
    },
  }),
  text_input: () => ({
    id: ulid(),
    type: 'text_input' as const,
    properties: {
      name: 'Text Input',
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
      name: 'Multiple Choice',
      choices: [{ id: ulid(), label: 'Choice 1' }],
    },
    validations: {
      required: false,
    },
  }),
  picture_choice: () => ({
    id: ulid(),
    type: 'picture_choice' as const,
    properties: {
      name: 'Picture Choice',
      choices: [
        { id: ulid(), label: 'Choice 1' },
        { id: ulid(), label: 'Choice 2' },
      ],
    },
    validations: {
      required: false,
    },
  }),
  dropdown: () => ({
    id: ulid(),
    type: 'dropdown' as const,
    properties: {
      name: 'Dropdown',
      options: [{ id: ulid(), label: 'Option 1' }],
    },
    validations: {
      required: false,
    },
  }),
  loader: () => ({
    id: ulid(),
    type: 'loader' as const,
    properties: {
      description: '',
      duration: 3,
    },
  }),
}

const PREVIEW_BLOCK_DATA: Record<string, Block> = {
  text_input: {
    id: '',
    type: 'text_input',
    properties: {
      name: 'Text Input',
      placeholder: 'Enter your name...',
    },
    validations: {},
  },
  multiple_choice: {
    id: '',
    type: 'multiple_choice',
    properties: {
      name: 'Multiple Choice',
      choices: [
        { id: '1', label: 'United States' },
        { id: '2', label: 'Canada' },
        { id: '3', label: 'United Kingdom' },
      ],
    },
    validations: {},
  },
  picture_choice: {
    id: '',
    type: 'picture_choice',
    properties: {
      name: 'Picture Choice',
      choices: [
        { id: '1', label: '20 - 29 Years Old' },
        { id: '2', label: '30 - 39 Years Old' },
      ],
    },
    validations: {},
  },
  dropdown: {
    id: '',
    type: 'dropdown',
    properties: {
      name: 'Dropdown',
      options: [
        { id: '1', label: 'United States' },
        { id: '2', label: 'Canada' },
        { id: '3', label: 'United Kingdom' },
      ],
    },
    validations: {},
  },
  loader: {
    id: '',
    type: 'loader',
    properties: {
      description: 'Calculating your results...',
      duration: 3,
    },
  },
}

interface PageTemplate {
  id: string
  icon: React.ComponentType<{ className?: string }>
  blocks: Block['type'][]
  name: string
  description: string
  defaultPageProperties: Page['properties']
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'blank',
    icon: FileIcon,
    blocks: [],
    name: 'Blank',
    description: 'Start with an empty page and add blocks as needed.',
    defaultPageProperties: {
      buttonAction: 'next',
      buttonText: 'Continue',
      showButton: true,
    },
  },
  {
    id: 'text_input',
    icon: MenuIcon,
    blocks: ['text_input'],
    name: 'Text Input',
    description: 'Collect brief text responses like names or short answers.',
    defaultPageProperties: {
      buttonAction: 'next',
      buttonText: 'Continue',
      showButton: true,
    },
  },
  {
    id: 'multiple_choice',
    icon: ListLettersIcon,
    blocks: ['multiple_choice'],
    name: 'Multiple Choice',
    description: 'Let users select from a list of predefined options. Auto-advances on selection.',
    defaultPageProperties: {
      buttonAction: 'next',
      buttonText: 'Continue',
      showButton: false,
    },
  },
  {
    id: 'picture_choice',
    icon: LayoutGridIcon,
    blocks: ['picture_choice'],
    name: 'Picture Choice',
    description: 'Display image-based choices in a grid. Users select one option from visually rich cards.',
    defaultPageProperties: {
      buttonAction: 'next',
      buttonText: 'Continue',
      showButton: false,
    },
  },
  {
    id: 'dropdown',
    icon: ChevronDownIcon,
    blocks: ['dropdown'],
    name: 'Dropdown',
    description: 'Present many options in a compact dropdown menu. Ideal for long lists.',
    defaultPageProperties: {
      buttonAction: 'next',
      buttonText: 'Continue',
      showButton: true,
    },
  },
  {
    id: 'loader',
    icon: LoaderIcon,
    blocks: ['loader'],
    name: 'Loader',
    description:
      'Display a progress indicator that fills up over time. The Continue button is disabled until loading completes.',
    defaultPageProperties: {
      buttonAction: 'next',
      buttonText: 'Continue',
      showButton: true,
    },
  },
]

function getPageTemplate(id: string) {
  return PAGE_TEMPLATES.find((template) => template.id === id)!
}

const AddPageDialogContext = React.createContext<{
  onPageAdd: (page: Page) => void
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
} | null>(null)

function useAddPageDialogContext() {
  const context = React.use(AddPageDialogContext)
  if (!context) {
    throw new Error('AddPageDialog components must be used within AddPageDialog.Root')
  }
  return context
}

function AddPageDialogRoot({ children, onPageAdd }: { children: React.ReactNode; onPageAdd: (page: Page) => void }) {
  const [open, setOpen] = React.useState(false)

  return (
    <AddPageDialogContext value={{ onPageAdd, setOpen }}>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        {children}
      </Dialog.Root>
    </AddPageDialogContext>
  )
}

function AddPageDialogPopup() {
  const { onPageAdd, setOpen } = useAddPageDialogContext()

  const templateIds = PAGE_TEMPLATES.map((t) => t.id)

  const [highlightedTemplateId, setHighlightedTemplateId] = React.useState<string | undefined>(templateIds[0])
  const highlightedTemplate = highlightedTemplateId ? getPageTemplate(highlightedTemplateId) : undefined

  const handlePageAdd = (templateId: string) => {
    const template = getPageTemplate(templateId)

    const blocks: Block[] = []
    template.blocks.forEach((type) => {
      // For input blocks, prepend a heading block
      if (INPUT_BLOCK_TYPES.includes(type)) {
        blocks.push(ADD_BLOCK_DATA.heading())
      }
      blocks.push(ADD_BLOCK_DATA[type]() as Block)
    })

    const page: Page = {
      id: ulid(),
      blocks,
      properties: template.defaultPageProperties,
    }
    onPageAdd(page)
    setOpen(false)
  }

  return (
    <Dialog.Content showCloseButton={false} className="max-w-2xl gap-0 p-0 sm:max-w-2xl">
      <Combobox.Root<string>
        inline
        autoHighlight
        highlightItemOnHover={false}
        items={templateIds}
        onItemHighlighted={setHighlightedTemplateId}
        onValueChange={(_, eventDetails) => eventDetails.cancel()}
      >
        <div className="flex flex-col">
          <div className="relative flex h-12 shrink-0 items-center border-b border-border">
            <SearchIcon className="pointer-events-none absolute left-4.5 size-4 text-muted-foreground" />
            <Combobox.Input
              className="h-full flex-1 bg-transparent pl-10.5 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Find page templates..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && highlightedTemplateId) {
                  handlePageAdd(highlightedTemplateId)
                }
              }}
            />
          </div>
          <div className="flex h-[650px] max-h-[calc(90vh-48px)]">
            <Combobox.List className="flex w-full flex-col gap-0.5 overflow-y-auto p-2 data-empty:hidden md:max-w-[250px] md:border-r md:border-border">
              {(templateId: string) => {
                const template = getPageTemplate(templateId)
                return (
                  <Combobox.Item
                    key={templateId}
                    value={templateId}
                    onClick={() => {
                      setHighlightedTemplateId(templateId)
                    }}
                    onDoubleClick={() => handlePageAdd(templateId)}
                    className={cn(
                      'flex h-8 shrink-0 cursor-pointer items-center gap-2.5 rounded-md px-2.5 transition-colors outline-none',
                      'hover:bg-secondary',
                      highlightedTemplateId === templateId && 'bg-secondary',
                    )}
                  >
                    <template.icon className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium">{template.name}</span>
                  </Combobox.Item>
                )
              }}
            </Combobox.List>
            {highlightedTemplate && (
              <div className="hidden flex-1 flex-col md:flex">
                <div className="flex flex-1 flex-col overflow-y-auto">
                  <div className="border-b border-border px-6 pt-5 pb-6">
                    <h2 className="mb-2 text-xl font-bold text-foreground">{highlightedTemplate.name}</h2>
                    <p className="text-sm text-muted-foreground">{highlightedTemplate.description}</p>
                  </div>

                  <div className="flex-1 px-6 pt-5 pb-6">
                    <Badge variant="secondary" className="mb-4">
                      Preview
                    </Badge>
                    {highlightedTemplate.blocks.map((blockType, index) => (
                      <BlockComponent key={blockType} static block={PREVIEW_BLOCK_DATA[blockType]!} index={index} />
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 justify-end border-t border-border p-4">
                  <Button onClick={() => handlePageAdd(highlightedTemplate.id)}>Add page</Button>
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
                    No input fields match your search. Retry with a different keyword.
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

export const AddPageDialog = {
  Root: AddPageDialogRoot,
  Trigger: Dialog.Trigger,
  Popup: AddPageDialogPopup,
}
