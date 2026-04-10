import { getBlockInfo } from '@/components/block'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { EmailBlock as EmailBlockType } from '@shopfunnel/core/funnel/types'
import { Field } from '../field'
import { Pane } from '../pane'
import { Panel } from '../panel'

export function EmailBlockPanel({
  block,
  onBlockUpdate,
}: {
  block: EmailBlockType
  onBlockUpdate: (block: Partial<EmailBlockType>) => void
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
              <Pane.GroupLabel>Placeholder</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Input
              placeholder="Enter placeholder..."
              value={block.properties.placeholder ?? ''}
              onValueChange={(value) => onBlockUpdate({ properties: { ...block.properties, placeholder: value } })}
            />
          </Pane.Group>
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Options</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Field.Root>
              <Field.Label>Required</Field.Label>
              <Field.Control>
                <SegmentedControl.Root
                  value={block.validations.required ?? false}
                  onValueChange={(value: boolean) =>
                    onBlockUpdate({ validations: { ...block.validations, required: value } })
                  }
                >
                  <SegmentedControl.Segment value={false}>No</SegmentedControl.Segment>
                  <SegmentedControl.Segment value={true}>Yes</SegmentedControl.Segment>
                </SegmentedControl.Root>
              </Field.Control>
            </Field.Root>
            <Field.Root>
              <Field.Label>Show Consent</Field.Label>
              <Field.Control>
                <SegmentedControl.Root
                  value={block.properties.showConsent}
                  onValueChange={(value: boolean) =>
                    onBlockUpdate({ properties: { ...block.properties, showConsent: value } })
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
    </Panel>
  )
}
