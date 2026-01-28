import { getBlockInfo } from '@/components/block'
import { Select } from '@/components/ui/select'
import type { SpacerBlock as SpacerBlockType } from '@shopfunnel/core/funnel/types'
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
}: {
  block: SpacerBlockType
  onBlockUpdate: (block: Partial<SpacerBlockType>) => void
}) {
  const blockInfo = getBlockInfo(block.type)
  return (
    <Panel>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>{blockInfo?.name}</Pane.Title>
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
