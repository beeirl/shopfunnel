import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { ShortTextBlock } from '@shopfunnel/core/form/schema'
import { Field } from './field'
import { Pane } from './pane'

export function ShortTextPane({
  block,
  onUpdate,
}: {
  block: ShortTextBlock
  onUpdate: (updates: Partial<ShortTextBlock>) => void
}) {
  return (
    <div className="flex flex-col">
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>Question</Pane.Title>
        </Pane.Header>
        <Input
          size="sm"
          placeholder="Your question here..."
          value={block.properties.label}
          onValueChange={(value) => onUpdate({ properties: { ...block.properties, label: value } })}
        />
      </Pane.Root>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>Description</Pane.Title>
        </Pane.Header>
        <Input
          size="sm"
          placeholder="Enter description..."
          value={block.properties.description ?? ''}
          onValueChange={(value) =>
            onUpdate({
              properties: { ...block.properties, description: value || undefined },
            })
          }
        />
      </Pane.Root>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>Validation</Pane.Title>
        </Pane.Header>
        <Field.Root>
          <Field.Label>Required</Field.Label>
          <Field.Control>
            <SegmentedControl.Root
              value={block.validations.required ?? false}
              onValueChange={(value: boolean) => onUpdate({ validations: { ...block.validations, required: value } })}
            >
              <SegmentedControl.Segment value={false}>No</SegmentedControl.Segment>
              <SegmentedControl.Segment value={true}>Yes</SegmentedControl.Segment>
            </SegmentedControl.Root>
          </Field.Control>
        </Field.Root>
        <Field.Root>
          <Field.Label>Email</Field.Label>
          <Field.Control>
            <SegmentedControl.Root
              value={block.validations.email ?? false}
              onValueChange={(value: boolean) => onUpdate({ validations: { ...block.validations, email: value } })}
            >
              <SegmentedControl.Segment value={false}>No</SegmentedControl.Segment>
              <SegmentedControl.Segment value={true}>Yes</SegmentedControl.Segment>
            </SegmentedControl.Root>
          </Field.Control>
        </Field.Root>
      </Pane.Root>
    </div>
  )
}
