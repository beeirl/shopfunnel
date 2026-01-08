import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { SpacerBlock as SpacerBlockType } from '@shopfunnel/core/quiz/types'
import { IconTrash as TrashIcon } from '@tabler/icons-react'
import { Pane } from '../pane'
import { Panel } from '../panel'

const SIZES = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
] as const

export function SpacerBlockPanel({
  block,
  onBlockUpdate,
  onBlockRemove,
}: {
  block: SpacerBlockType
  onBlockUpdate: (block: Partial<SpacerBlockType>) => void
  onBlockRemove: () => void
}) {
  const blockInfo = getBlockInfo(block.type)
  return (
    <Panel>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>{blockInfo?.name}</Pane.Title>
          <Button className="-mr-2" size="icon" variant="ghost" onClick={onBlockRemove}>
            <TrashIcon />
          </Button>
        </Pane.Header>
        <Pane.Content>
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Size</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Select.Root
              items={SIZES}
              value={block.properties.size}
              onValueChange={(value) =>
                onBlockUpdate({ properties: { ...block.properties, size: value as 'sm' | 'md' | 'lg' } })
              }
            >
              <Select.Trigger className="w-full">
                <Select.Value />
              </Select.Trigger>
              <Select.Content alignItemWithTrigger={false}>
                <Select.Group>
                  {SIZES.map((size) => (
                    <Select.Item key={size.value} value={size.value}>
                      {size.label}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
