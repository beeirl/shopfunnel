import { getBlockInfo } from '@/components/block'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { HeadingBlock as HeadingBlockType } from '@shopfunnel/core/quiz/types'
import { IconAlignCenter as AlignCenterIcon, IconAlignLeft as AlignLeftIcon } from '@tabler/icons-react'
import { Field } from '../field'
import { Pane } from '../pane'
import { Panel } from '../panel'

export function HeadingBlockPanel({
  block,
  onBlockUpdate,
}: {
  block: HeadingBlockType
  onBlockUpdate: (block: Partial<HeadingBlockType>) => void
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
              <Pane.GroupLabel>Text</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Input
              placeholder="Your heading here..."
              value={block.properties.text}
              onValueChange={(value) => onBlockUpdate({ properties: { ...block.properties, text: value } })}
            />
          </Pane.Group>
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Formatting</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Field.Root>
              <Field.Label>Alignment</Field.Label>
              <Field.Control>
                <SegmentedControl.Root
                  value={block.properties.alignment}
                  onValueChange={(value) =>
                    onBlockUpdate({ properties: { ...block.properties, alignment: value as 'left' | 'center' } })
                  }
                >
                  <SegmentedControl.Segment value="left">
                    <AlignLeftIcon size={16} />
                  </SegmentedControl.Segment>
                  <SegmentedControl.Segment value="center">
                    <AlignCenterIcon size={16} />
                  </SegmentedControl.Segment>
                </SegmentedControl.Root>
              </Field.Control>
            </Field.Root>
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
