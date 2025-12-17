import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider, PointerSensor } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { MultipleChoiceBlock } from '@shopfunnel/core/form/schema'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { Field } from './field'
import { Pane } from './pane'

type Choice = MultipleChoiceBlock['properties']['choices'][number]

function ChoiceItem({
  choice,
  index,
  onUpdate,
  onDelete,
  autoFocus,
}: {
  choice: Choice
  index: number
  onUpdate: (updates: Partial<Choice>) => void
  onDelete: () => void
  autoFocus?: boolean
}) {
  const { ref } = useSortable({ id: choice.id, index })

  return (
    <div ref={ref} className="flex items-center gap-1">
      <Input
        className="flex-1"
        autoFocus={autoFocus}
        size="sm"
        placeholder="Choice label..."
        value={choice.label}
        onValueChange={(value) => onUpdate({ label: value })}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <Button size="icon" variant="ghost" onClick={onDelete} onPointerDown={(e) => e.stopPropagation()}>
        <TrashIcon />
      </Button>
    </div>
  )
}

export function MultipleChoicePane({
  block,
  onUpdate,
}: {
  block: MultipleChoiceBlock
  onUpdate: (updates: Partial<MultipleChoiceBlock>) => void
}) {
  const choices = block.properties.choices

  const [focusChoiceId, setFocusChoiceId] = React.useState<string | null>(null)

  const handleChoiceUpdate = (choiceId: string, updates: Partial<Choice>) => {
    onUpdate({
      properties: {
        ...block.properties,
        choices: choices.map((c) => (c.id === choiceId ? { ...c, ...updates } : c)),
      },
    })
  }

  const handleChoiceDelete = (choiceId: string) => {
    onUpdate({
      properties: {
        ...block.properties,
        choices: choices.filter((c) => c.id !== choiceId),
      },
    })
  }

  const handleChoiceAdd = () => {
    const id = ulid()
    const newChoice: Choice = {
      id,
      label: `Choice ${choices.length + 1}`,
    }
    setFocusChoiceId(id)
    onUpdate({
      properties: {
        ...block.properties,
        choices: [...choices, newChoice],
      },
    })
  }

  const handleChoicesReorder = (newChoices: Choice[]) => {
    onUpdate({
      properties: {
        ...block.properties,
        choices: newChoices,
      },
    })
  }

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
          <Pane.Title>Choices</Pane.Title>
          <Button size="icon-sm" variant="ghost" onClick={handleChoiceAdd}>
            <PlusIcon />
          </Button>
        </Pane.Header>
        <DragDropProvider
          sensors={[
            PointerSensor.configure({
              activationConstraints: {
                delay: {
                  value: 100,
                  tolerance: 5,
                },
              },
            }),
          ]}
          onDragEnd={(event) => handleChoicesReorder(move(choices, event))}
        >
          <div className="flex flex-col gap-1">
            {choices.map((choice, index) => (
              <ChoiceItem
                key={choice.id}
                choice={choice}
                index={index}
                onUpdate={(updates) => handleChoiceUpdate(choice.id, updates)}
                onDelete={() => handleChoiceDelete(choice.id)}
                autoFocus={choice.id === focusChoiceId}
              />
            ))}
          </div>
        </DragDropProvider>
        {choices.length === 0 && (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">No choices yet</div>
        )}
      </Pane.Root>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>Validation</Pane.Title>
        </Pane.Header>
        <Field.Root>
          <Field.Label>Mode</Field.Label>
          <Field.Control>
            <SegmentedControl.Root
              value={block.validations.required ?? false}
              onValueChange={(value: boolean) => onUpdate({ properties: { ...block.properties, multiple: value } })}
            >
              <SegmentedControl.Segment value={false}>Single</SegmentedControl.Segment>
              <SegmentedControl.Segment value={true}>Multiple</SegmentedControl.Segment>
            </SegmentedControl.Root>
          </Field.Control>
        </Field.Root>
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
      </Pane.Root>
    </div>
  )
}
