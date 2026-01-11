import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { TextInputBlock as TextInputBlockType } from '@shopfunnel/core/funnel/types'
import { IconTrash as TrashIcon } from '@tabler/icons-react'
import { Field } from '../field'
import { Pane } from '../pane'
import { Panel } from '../panel'

export function TextInputBlockPanel({
  block,
  onBlockUpdate,
  onBlockRemove,
}: {
  block: TextInputBlockType
  onBlockUpdate: (block: Partial<TextInputBlockType>) => void
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
              <Pane.GroupLabel>Name</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Input
              placeholder="Enter name..."
              value={block.properties.name}
              onValueChange={(value) => onBlockUpdate({ properties: { ...block.properties, name: value } })}
            />
          </Pane.Group>
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
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
