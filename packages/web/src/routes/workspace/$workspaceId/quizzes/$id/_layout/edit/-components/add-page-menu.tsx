import { Menu } from '@/components/ui/menu'
import type { Block, Page } from '@shopfunnel/core/quiz/types'
import {
  IconChevronDown as ChevronDownIcon,
  IconFile as FileIcon,
  IconLayoutGrid as LayoutGridIcon,
  IconListLetters as ListLettersIcon,
  IconLoader as LoaderIcon,
  IconMenu as MenuIcon,
} from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'

const ADD_BLOCK_DATA = {
  heading: (): Block => ({
    id: ulid(),
    type: 'heading',
    properties: {
      text: 'Your question here',
      alignment: 'left',
    },
  }),
  text_input: (): Block => ({
    id: ulid(),
    type: 'text_input',
    properties: {
      name: 'Text Input',
      placeholder: '',
    },
    validations: {
      required: false,
    },
  }),
  multiple_choice: (): Block => ({
    id: ulid(),
    type: 'multiple_choice',
    properties: {
      name: 'Multiple Choice',
      options: [{ id: ulid(), label: 'Choice 1' }],
    },
    validations: {
      required: false,
    },
  }),
  picture_choice: (): Block => ({
    id: ulid(),
    type: 'picture_choice',
    properties: {
      name: 'Picture Choice',
      options: [
        { id: ulid(), label: 'Choice 1' },
        { id: ulid(), label: 'Choice 2' },
      ],
    },
    validations: {
      required: false,
    },
  }),
  dropdown: (): Block => ({
    id: ulid(),
    type: 'dropdown',
    properties: {
      name: 'Dropdown',
      options: [{ id: ulid(), label: 'Option 1' }],
    },
    validations: {
      required: false,
    },
  }),
  loader: (): Block => ({
    id: ulid(),
    type: 'loader',
    properties: {
      duration: 3000,
    },
  }),
}

const PAGE_TEMPLATES = [
  { id: 'blank', icon: FileIcon, name: 'Blank', blocks: [] as string[] },
  { id: 'text_input', icon: MenuIcon, name: 'Text Input', blocks: ['text_input'] },
  { id: 'multiple_choice', icon: ListLettersIcon, name: 'Multiple Choice', blocks: ['multiple_choice'] },
  { id: 'picture_choice', icon: LayoutGridIcon, name: 'Picture Choice', blocks: ['picture_choice'] },
  { id: 'dropdown', icon: ChevronDownIcon, name: 'Dropdown', blocks: ['dropdown'] },
  { id: 'loader', icon: LoaderIcon, name: 'Loader', blocks: ['loader'] },
]

const AddPageMenuContext = React.createContext<{
  onPageAdd: (page: Page) => void
  pageCount: number
  side: 'left' | 'right'
} | null>(null)

function useAddPageMenuContext() {
  const context = React.use(AddPageMenuContext)
  if (!context) {
    throw new Error('AddPageMenu components must be used within AddPageMenu.Root')
  }
  return context
}

function AddPageMenuRoot({
  children,
  onPageAdd,
  pageCount,
  side,
}: {
  children: React.ReactNode
  onPageAdd: (page: Page) => void
  pageCount: number
  side: 'left' | 'right'
}) {
  return (
    <AddPageMenuContext value={{ onPageAdd, pageCount, side }}>
      <Menu.Root>{children}</Menu.Root>
    </AddPageMenuContext>
  )
}

function AddPageMenuContent() {
  const { onPageAdd, pageCount, side } = useAddPageMenuContext()

  const handlePageAdd = (templateId: string) => {
    const template = PAGE_TEMPLATES.find((t) => t.id === templateId)!

    const blocks: Block[] = []
    template.blocks.forEach((type) => {
      // For input blocks, prepend a heading block
      if (['text_input', 'multiple_choice', 'picture_choice', 'dropdown'].includes(type)) {
        blocks.push(ADD_BLOCK_DATA.heading())
      }
      const blockFactory = ADD_BLOCK_DATA[type]
      if (blockFactory) {
        blocks.push(blockFactory())
      }
    })

    const page: Page = {
      id: ulid(),
      name: `Page ${pageCount + 1}`,
      blocks,
      properties: { buttonText: 'Continue' },
    }
    onPageAdd(page)
  }

  return (
    <Menu.Content side={side} align="center">
      <Menu.Group>
        <Menu.Label>Pages</Menu.Label>
        {PAGE_TEMPLATES.map((template) => (
          <Menu.Item key={template.id} onClick={() => handlePageAdd(template.id)}>
            <template.icon className="size-4 text-muted-foreground" />
            {template.name}
          </Menu.Item>
        ))}
      </Menu.Group>
    </Menu.Content>
  )
}

export const AddPageMenu = {
  Root: AddPageMenuRoot,
  Trigger: Menu.Trigger,
  Content: AddPageMenuContent,
}
