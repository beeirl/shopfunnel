import { getBlockInfo } from '@/components/block'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { TextInputBlock as TextInputBlockData } from '@shopfunnel/core/form/types'
import { Field } from '../field'
import { Pane } from '../pane'

export function TextInputBlockPane({
  data,
  onDataUpdate,
}: {
  data: TextInputBlockData
  onDataUpdate: (data: Partial<TextInputBlockData>) => void
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
            <Pane.GroupLabel>Name</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Input
            placeholder="Enter name..."
            value={data.properties.name}
            onValueChange={(value) => onDataUpdate({ properties: { ...data.properties, name: value } })}
          />
        </Pane.Group>
        <Pane.Separator />
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Validation</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Field.Root>
            <Field.Label>Required</Field.Label>
            <Field.Control>
              <SegmentedControl.Root
                value={data.validations.required ?? false}
                onValueChange={(value: boolean) =>
                  onDataUpdate({ validations: { ...data.validations, required: value } })
                }
              >
                <SegmentedControl.Segment value={false}>No</SegmentedControl.Segment>
                <SegmentedControl.Segment value={true}>Yes</SegmentedControl.Segment>
              </SegmentedControl.Root>
            </Field.Control>
          </Field.Root>
        </Pane.Group>
      </Pane.Content>
    </Pane.Root>
  )
}
