import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { getBlock } from '@/form/block'
import type { ShortTextBlock as ShortTextBlockSchema } from '@shopfunnel/core/form/schema'
import { Field } from '../field'
import { Pane } from '../pane'

export function ShortTextBlockPane({
  schema,
  onSchemaUpdate,
}: {
  schema: ShortTextBlockSchema
  onSchemaUpdate: (schema: Partial<ShortTextBlockSchema>) => void
}) {
  const block = getBlock(schema.type)
  return (
    <Pane.Root>
      <Pane.Header>
        <Pane.Title>{block?.name}</Pane.Title>
      </Pane.Header>
      <Pane.Content>
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Question</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Input
            placeholder="Your question here..."
            value={schema.properties.label}
            onValueChange={(value) => onSchemaUpdate({ properties: { ...schema.properties, label: value } })}
          />
        </Pane.Group>
        <Pane.Separator />
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Description</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Input
            placeholder="Enter description..."
            value={schema.properties.description ?? ''}
            onValueChange={(value) =>
              onSchemaUpdate({
                properties: { ...schema.properties, description: value || undefined },
              })
            }
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
                value={schema.validations.required ?? false}
                onValueChange={(value: boolean) =>
                  onSchemaUpdate({ validations: { ...schema.validations, required: value } })
                }
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
                value={schema.validations.email ?? false}
                onValueChange={(value: boolean) =>
                  onSchemaUpdate({ validations: { ...schema.validations, email: value } })
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
