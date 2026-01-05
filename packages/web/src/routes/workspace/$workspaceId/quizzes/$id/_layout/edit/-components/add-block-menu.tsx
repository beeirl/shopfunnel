import { getBlockInfo } from '@/components/block'
import { Menu } from '@/components/ui/menu'
import type { Block } from '@shopfunnel/core/quiz/types'
import * as React from 'react'
import { ulid } from 'ulid'

const ADD_BLOCK_DATA: Record<Block['type'], () => Block> = {
  text_input: () => ({
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
  multiple_choice: () => ({
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
  picture_choice: () => ({
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
  dropdown: () => ({
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
  heading: () => ({
    id: ulid(),
    type: 'heading',
    properties: {
      text: 'Your heading here',
      alignment: 'left',
    },
  }),
  paragraph: () => ({
    id: ulid(),
    type: 'paragraph',
    properties: {
      text: 'Your text here',
      alignment: 'left',
    },
  }),
  gauge: () => ({
    id: ulid(),
    type: 'gauge',
    properties: {
      value: 50,
      minValue: 0,
      maxValue: 100,
    },
  }),
  list: () => ({
    id: ulid(),
    type: 'list',
    properties: {
      orientation: 'vertical',
      textPlacement: 'right',
      size: 'sm',
      items: [{ id: ulid(), title: 'Item', media: { type: 'emoji', value: '✓' } }],
    },
  }),
  image: () => ({
    id: ulid(),
    type: 'image',
    properties: {},
  }),
  loader: () => ({
    id: ulid(),
    type: 'loader',
    properties: {
      duration: 3000,
    },
  }),
}

const AddBlockMenuContext = React.createContext<{
  onBlockAdd: (block: Block) => void
  existingBlocks: Block[]
} | null>(null)

function useAddBlockMenuContext() {
  const context = React.use(AddBlockMenuContext)
  if (!context) {
    throw new Error('AddBlockMenu components must be used within AddBlockMenu.Root')
  }
  return context
}

function AddBlockMenuRoot({
  children,
  onBlockAdd,
  existingBlocks,
}: {
  children: React.ReactNode
  onBlockAdd: (block: Block) => void
  existingBlocks: Block[]
}) {
  return (
    <AddBlockMenuContext value={{ onBlockAdd, existingBlocks }}>
      <Menu.Root>{children}</Menu.Root>
    </AddBlockMenuContext>
  )
}

function AddBlockMenuContent() {
  const { onBlockAdd, existingBlocks } = useAddBlockMenuContext()

  const hasInputOrLoader = existingBlocks.some((block) =>
    ['text_input', 'multiple_choice', 'picture_choice', 'dropdown', 'loader'].includes(block.type),
  )

  const availableBlockTypes: Block['type'][] = hasInputOrLoader
    ? ['heading', 'paragraph', 'gauge', 'list', 'image']
    : ['text_input', 'multiple_choice', 'picture_choice', 'dropdown', 'loader']

  const handleBlockAdd = (type: Block['type']) => {
    onBlockAdd(ADD_BLOCK_DATA[type]())
  }

  return (
    <Menu.Content side="bottom" align="center">
      <Menu.Group>
        <Menu.Label>Blocks</Menu.Label>
        {availableBlockTypes.map((type) => {
          const blockInfo = getBlockInfo(type)
          return (
            <Menu.Item key={type} onClick={() => handleBlockAdd(type)}>
              <blockInfo.icon className="size-4 text-muted-foreground" />
              {blockInfo.name}
            </Menu.Item>
          )
        })}
      </Menu.Group>
    </Menu.Content>
  )
}

export const AddBlockMenu = {
  Root: AddBlockMenuRoot,
  Trigger: Menu.Trigger,
  Content: AddBlockMenuContent,
}
