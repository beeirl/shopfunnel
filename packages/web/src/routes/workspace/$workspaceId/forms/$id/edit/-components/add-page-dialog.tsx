import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Block, getBlock } from '@/form/block'
import { cn } from '@/lib/utils'
import { Combobox } from '@base-ui/react/combobox'
import type { BlockType, Page } from '@shopfunnel/core/form/schema'
import { IconSearch as SearchIcon, IconSearchOff as SearchOffIcon } from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'

interface PageTemplate {
  id: string
  blocks: BlockType[]
  name: string
  description: string
  defaultPageProperties: Page['properties']
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'short_text',
    blocks: ['short_text'],
    name: 'Short Text',
    description: 'Collect brief text responses like names, emails, or short answers.',
    defaultPageProperties: {
      buttonAction: 'next',
      buttonText: 'Continue',
      showButton: true,
    },
  },
  {
    id: 'multiple_choice',
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
    id: 'dropdown',
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
    id: 'slider',
    blocks: ['slider'],
    name: 'Slider',
    description: 'Allow users to select a value within a defined range using a draggable slider.',
    defaultPageProperties: {
      buttonAction: 'next',
      buttonText: 'Continue',
      showButton: true,
    },
  },
]

function getPageTemplate(id: string) {
  return PAGE_TEMPLATES.find((template) => template.id === id)
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

  const handlePageAdd = (templateId: string) => {
    const template = getPageTemplate(templateId)
    if (!template) return

    const blocks = template.blocks.map((type) => {
      const block = getBlock(type)
      return block.defaultSchema()
    })

    const page: Page = {
      id: ulid(),
      blocks,
      properties: template.defaultPageProperties,
    }
    onPageAdd(page)
    setOpen(false)
  }

  const highlightedTemplate = highlightedTemplateId ? getPageTemplate(highlightedTemplateId) : undefined
  const firstBlockType = highlightedTemplate?.blocks[0]
  const highlightedBlock = firstBlockType ? getBlock(firstBlockType) : undefined

  return (
    <Dialog.Content showCloseButton={false} className="max-w-2xl gap-0 p-0 sm:max-w-2xl">
      <Combobox.Root<string>
        inline
        autoHighlight
        highlightItemOnHover={false}
        items={templateIds}
        onItemHighlighted={setHighlightedTemplateId}
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
                if (!template || !template.blocks[0]) return null
                const firstBlock = getBlock(template.blocks[0])
                const IconComponent = firstBlock.icon
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
                    <IconComponent className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium">{template.name}</span>
                  </Combobox.Item>
                )
              }}
            </Combobox.List>
            {highlightedTemplateId && highlightedTemplate && highlightedBlock && (
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
                    <Block mode="preview" schema={highlightedBlock.previewSchema} selected={false} />
                  </div>
                </div>

                <div className="flex shrink-0 justify-end border-t border-border p-4">
                  <Button onClick={() => handlePageAdd(highlightedTemplateId)}>Add page</Button>
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
