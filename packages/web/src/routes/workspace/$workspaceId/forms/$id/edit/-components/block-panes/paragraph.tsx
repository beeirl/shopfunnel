import { getBlockInfo } from '@/components/block'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Textarea } from '@/components/ui/textarea'
import type { ParagraphBlock as ParagraphBlockData } from '@shopfunnel/core/form/types'
import { IconAlignCenter as AlignCenterIcon, IconAlignLeft as AlignLeftIcon } from '@tabler/icons-react'
import { Field } from '../field'
import { Pane } from '../pane'

export function ParagraphBlockPane({
  data,
  onDataUpdate,
}: {
  data: ParagraphBlockData
  onDataUpdate: (data: Partial<ParagraphBlockData>) => void
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
          <Textarea
            placeholder="Your text here..."
            value={data.properties.text}
            onChange={(e) => onDataUpdate({ properties: { ...data.properties, text: e.target.value } })}
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
