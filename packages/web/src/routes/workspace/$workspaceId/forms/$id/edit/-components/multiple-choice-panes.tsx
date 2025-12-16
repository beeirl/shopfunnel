import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider, PointerSensor } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { MultipleChoiceBlock } from '@shopfunnel/core/form/schema'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { Field } from './field'
import { Input } from './input'
import { PaneContent, PaneHeader, PaneRoot, PaneTitle } from './pane'

type Choice = MultipleChoiceBlock['properties']['choices'][number]

interface MultipleChoicePaneProps {
  block: MultipleChoiceBlock
  onUpdate: (updates: Partial<MultipleChoiceBlock>) => void
}

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
        value={choice.label}
        placeholder="Choice label..."
        onChange={(e) => onUpdate({ label: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()}
        autoFocus={autoFocus}
      />
      <Button size="icon-sm" variant="secondary" onClick={onDelete} onPointerDown={(e) => e.stopPropagation()}>
        <TrashIcon />
      </Button>
    </div>
  )
}

export function MultipleChoicePane({ block, onUpdate }: MultipleChoicePaneProps) {
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
    <div>
      <PaneRoot>
        <PaneHeader>
          <PaneTitle>Question</PaneTitle>
        </PaneHeader>
        <PaneContent>
          <Input
            value={block.properties.label}
            placeholder="Your question here..."
            onValueChange={(value) =>
              onUpdate({
                properties: { ...block.properties, label: value },
              })
            }
          />
        </PaneContent>
      </PaneRoot>

      <PaneRoot>
        <PaneHeader>
          <PaneTitle>Description</PaneTitle>
        </PaneHeader>
        <PaneContent>
          <Input
            value={block.properties.description ?? ''}
            placeholder="Enter description..."
            onValueChange={(value) =>
              onUpdate({
                properties: { ...block.properties, description: value || undefined },
              })
            }
          />
        </PaneContent>
      </PaneRoot>

      <PaneRoot>
        <PaneHeader>
          <PaneTitle>Choices</PaneTitle>
          <Button size="icon-sm" variant="ghost" onClick={handleChoiceAdd}>
            <PlusIcon />
          </Button>
        </PaneHeader>
        <PaneContent>
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
        </PaneContent>
      </PaneRoot>

      <PaneRoot>
        <PaneHeader>
          <PaneTitle>Validation</PaneTitle>
        </PaneHeader>
        <PaneContent className="gap-2">
          <Field.Root orientation="horizontal">
            <Field.Label htmlFor={`${block.id}-multiple`}>Multiple selection</Field.Label>
            <Switch
              id={`${block.id}-multiple`}
              checked={block.properties.multiple ?? false}
              onCheckedChange={(multiple) =>
                onUpdate({
                  properties: { ...block.properties, multiple },
                })
              }
            />
          </Field.Root>
          <Field.Root orientation="horizontal">
            <Field.Label htmlFor={`${block.id}-required`}>Required</Field.Label>
            <Switch
              id={`${block.id}-required`}
              checked={block.validations.required ?? false}
              onCheckedChange={(required) =>
                onUpdate({
                  validations: { ...block.validations, required },
                })
              }
            />
          </Field.Root>
        </PaneContent>
      </PaneRoot>
    </div>
  )
}
