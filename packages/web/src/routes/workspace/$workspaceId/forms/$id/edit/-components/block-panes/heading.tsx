import { getBlockInfo } from '@/components/block'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { HeadingBlock as HeadingBlockData } from '@shopfunnel/core/form/types'
import { IconAlignCenter as AlignCenterIcon, IconAlignLeft as AlignLeftIcon } from '@tabler/icons-react'
import { Field } from '../field'
import { Pane } from '../pane'

export function HeadingBlockPane({
  data,
  onDataUpdate,
}: {
  data: HeadingBlockData
  onDataUpdate: (data: Partial<HeadingBlockData>) => void
}) {
  const block = getBlockInfo(data.type)
  return (
    <Pane.Root>
      <Pane.Header>
        <Pane.Title>{block?.name}</Pane.Title>
      </Pane.Header>
      <Pane.Content>
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Text</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Input
            placeholder="Your heading here..."
            value={data.properties.text}
            onValueChange={(value) => onDataUpdate({ properties: { ...data.properties, text: value } })}
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
                value={data.properties.alignment}
                onValueChange={(value) =>
                  onDataUpdate({ properties: { ...data.properties, alignment: value as 'left' | 'center' } })
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
  )
}
