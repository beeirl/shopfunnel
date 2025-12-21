import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroup } from '@/components/ui/input-group'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { getBlock } from '@/form/block'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { MultipleChoiceBlock as MultipleChoiceBlockSchema } from '@shopfunnel/core/form/schema'
import {
  IconGripVertical as GripVerticalIcon,
  IconPhoto as PhotoIcon,
  IconPlus as PlusIcon,
  IconTrash as TrashIcon,
} from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { Field } from '../field'
import { MediaPicker } from '../media-picker'
import { Pane } from '../pane'

type Choice = MultipleChoiceBlockSchema['properties']['choices'][number]

function ChoiceItem({
  choice,
  index,
  inputRef,
  onUpdate,
  onDelete,
  onImageUpload,
}: {
  choice: Choice
  index: number
  inputRef: (el: HTMLInputElement | null) => void
  onUpdate: (updates: Partial<Choice>) => void
  onDelete: () => void
  onImageUpload: (file: File) => Promise<string>
}) {
  const { ref, handleRef } = useSortable({ id: choice.id, index })
  const inputGroupRef = React.useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} className="flex items-center gap-1">
      <button
        ref={handleRef}
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <InputGroup.Root className="flex-1" ref={inputGroupRef}>
        <InputGroup.Addon>
          <MediaPicker.Root>
            <MediaPicker.Trigger
              render={
                <InputGroup.Button size="icon-xs">
                  {choice.media ? (
                    choice.media.type === 'emoji' ? (
                      choice.media.value
                    ) : (
                      <img src={choice.media.value} alt="" className="size-full rounded object-cover" />
                    )
                  ) : (
                    <PhotoIcon />
                  )}
                </InputGroup.Button>
              }
            />
            <MediaPicker.Content
              anchor={inputGroupRef}
              side="left"
              align="start"
              onEmojiSelect={(emoji) => onUpdate({ media: { type: 'emoji', value: emoji } })}
              onImageUpload={async (file) => {
                const url = await onImageUpload(file)
                onUpdate({ media: { type: 'image', value: url } })
              }}
            />
          </MediaPicker.Root>
        </InputGroup.Addon>
        <InputGroup.Input
          ref={inputRef}
          placeholder="Choice label..."
          value={choice.label}
          onValueChange={(value) => onUpdate({ label: value })}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </InputGroup.Root>
      <Button size="icon" variant="ghost" onClick={onDelete} onPointerDown={(e) => e.stopPropagation()}>
        <TrashIcon />
      </Button>
    </div>
  )
}

export function MultipleChoiceBlockPane({
  schema,
  onSchemaUpdate,
  onImageUpload,
}: {
  schema: MultipleChoiceBlockSchema
  onSchemaUpdate: (schema: Partial<MultipleChoiceBlockSchema>) => void
  onImageUpload: (file: File) => Promise<string>
}) {
  const block = getBlock(schema.type)
  const choices = schema.properties.choices

  const choiceInputRefs = React.useRef<Map<string, HTMLInputElement>>(new Map())

  const handleChoiceUpdate = (choiceId: string, updates: Partial<Choice>) => {
    onSchemaUpdate({
      properties: {
        ...schema.properties,
        choices: choices.map((c) => (c.id === choiceId ? { ...c, ...updates } : c)),
      },
    })
  }

  const handleChoiceDelete = (choiceId: string) => {
    onSchemaUpdate({
      properties: {
        ...schema.properties,
        choices: choices.filter((c) => c.id !== choiceId),
      },
    })
  }

  const handleChoiceAdd = () => {
    const id = ulid()
    onSchemaUpdate({
      properties: {
        ...schema.properties,
        choices: [
          ...choices,
          {
            id,
            label: `Choice ${choices.length + 1}`,
          },
        ],
      },
    })
    requestAnimationFrame(() => {
      const input = choiceInputRefs.current.get(id)
      input?.focus()
      input?.select()
    })
  }

  const handleChoicesReorder = (newChoices: Choice[]) => {
    onSchemaUpdate({
      properties: {
        ...schema.properties,
        choices: newChoices,
      },
    })
  }

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
            <Pane.GroupLabel>Choices</Pane.GroupLabel>
            <Button size="icon" variant="ghost" onClick={handleChoiceAdd}>
              <PlusIcon />
            </Button>
          </Pane.GroupHeader>
          <DragDropProvider onDragEnd={(event) => handleChoicesReorder(move(choices, event))}>
            <div className="flex flex-col gap-1">
              {choices.map((choice, index) => (
                <ChoiceItem
                  key={choice.id}
                  choice={choice}
                  index={index}
                  inputRef={(el) => {
                    if (el) choiceInputRefs.current.set(choice.id, el)
                    else choiceInputRefs.current.delete(choice.id)
                  }}
                  onUpdate={(updates) => handleChoiceUpdate(choice.id, updates)}
                  onDelete={() => handleChoiceDelete(choice.id)}
                  onImageUpload={onImageUpload}
                />
              ))}
            </div>
          </DragDropProvider>
          {choices.length === 0 && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">No choices yet</div>
          )}
        </Pane.Group>
        <Pane.Separator />
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Validation</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Field.Root>
            <Field.Label>Mode</Field.Label>
            <Field.Control>
              <SegmentedControl.Root
                value={schema.properties.multiple ?? false}
                onValueChange={(value: boolean) =>
                  onSchemaUpdate({ properties: { ...schema.properties, multiple: value } })
                }
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
        </Pane.Group>
      </Pane.Content>
    </Pane.Root>
  )
}
