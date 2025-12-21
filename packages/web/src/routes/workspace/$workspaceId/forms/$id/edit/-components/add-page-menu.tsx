import { Menu } from '@/components/ui/menu'
import { getBlock } from '@/form/block'
import type { BlockType, Page } from '@shopfunnel/core/form/schema'
import { IconListLetters as ListLettersIcon, IconMenu as MenuIcon } from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'

interface PageTemplate {
  type: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  blockTypes: BlockType[]
  defaultProperties: Page['properties']
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    type: 'short_text',
    title: 'Short Text',
    icon: MenuIcon,
    blockTypes: ['short_text'],
    defaultProperties: {
      buttonAction: 'next',
      buttonText: 'Continue',
      showButton: true,
    },
  },
  {
    type: 'multiple_choice',
    title: 'Multiple Choice',
    icon: ListLettersIcon,
    blockTypes: ['multiple_choice'],
    defaultProperties: {
      buttonAction: 'next',
      buttonText: 'Continue',
      showButton: false,
    },
  },
]

const AddPageMenuContext = React.createContext<{
  onPageAdd: (page: Page) => void
} | null>(null)

function useAddPageMenuContext() {
  const context = React.use(AddPageMenuContext)
  if (!context) {
    throw new Error('AddPageMenu components must be used within AddPageMenu.Root')
  }
  return context
}

function AddPageMenuRoot({ children, onPageAdd }: { children: React.ReactNode; onPageAdd: (page: Page) => void }) {
  return (
    <AddPageMenuContext value={{ onPageAdd }}>
      <Menu.Root>{children}</Menu.Root>
    </AddPageMenuContext>
  )
}

function AddPageMenuContent() {
  const { onPageAdd } = useAddPageMenuContext()

  const handlePageAdd = (template: PageTemplate) => {
    const page: Page = {
      id: ulid(),
      blocks: template.blockTypes.map((type) => getBlock(type).defaultSchema()),
      properties: template.defaultProperties,
    }
    onPageAdd(page)
  }

  return (
    <Menu.Content align="start" side="right" className="w-auto">
      {PAGE_TEMPLATES.map((template) => {
        return (
          <Menu.Item key={template.type} onClick={() => handlePageAdd(template)}>
            <template.icon className="size-4 text-muted-foreground" />
            {template.title}
          </Menu.Item>
        )
      })}
    </Menu.Content>
  )
}

export const AddPageMenu = {
  Root: AddPageMenuRoot,
  Trigger: Menu.Trigger,
  Content: AddPageMenuContent,
}
