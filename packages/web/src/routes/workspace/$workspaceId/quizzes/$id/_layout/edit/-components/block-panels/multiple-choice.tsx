import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroup } from '@/components/ui/input-group'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { MultipleChoiceBlock as MultipleChoiceBlockType } from '@shopfunnel/core/quiz/types'
import {
  IconGripVertical as GripVerticalIcon,
  IconPlus as PlusIcon,
  IconTrash as TrashIcon,
  IconUpload as UploadIcon,
  IconX as XIcon,
} from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { Field } from '../field'
import { MediaPicker } from '../media-picker'
import { Pane } from '../pane'
import { Panel } from '../panel'

type Choice = MultipleChoiceBlockType['properties']['options'][number]

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
  const mediaButtonRef = React.useRef<HTMLDivElement>(null)

  const handleMediaClear = () => {
    onUpdate({ media: undefined })
  }

  return (
    <div ref={ref} className="grid grid-cols-[auto_1fr_auto] items-center gap-1">
      <button
        ref={handleRef}
        type="button"
        className="cursor-grab touch-none pr-1 text-muted-foreground hover:text-foreground"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <MediaPicker.Root>
        <div ref={mediaButtonRef}>
          <MediaPicker.Trigger
            render={
              <InputGroup.Root>
                <InputGroup.Addon>
                  {choice.media ? (
                    choice.media.type === 'emoji' ? (
                      <span className="text-base">{choice.media.value}</span>
                    ) : (
                      <img src={choice.media.value} alt="" className="size-6 rounded object-cover" />
                    )
                  ) : (
                    <UploadIcon className="size-4" />
                  )}
                </InputGroup.Addon>
                <InputGroup.Input
                  readOnly
                  placeholder="Add media..."
                  value={choice.media ? (choice.media.type === 'emoji' ? 'Emoji' : 'Image') : ''}
                  className="cursor-pointer"
                />
                {choice.media && (
                  <InputGroup.Addon align="inline-end">
                    <InputGroup.Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMediaClear()
                      }}
                    >
                      <XIcon className="size-4" />
                    </InputGroup.Button>
                  </InputGroup.Addon>
                )}
              </InputGroup.Root>
            }
          />
        </div>
        <MediaPicker.Content
          anchor={mediaButtonRef}
          side="left"
          align="start"
          onEmojiSelect={(emoji) => onUpdate({ media: { type: 'emoji', value: emoji } })}
          onImageUpload={async (file) => {
            const url = await onImageUpload(file)
            onUpdate({ media: { type: 'image', value: url } })
          }}
        />
      </MediaPicker.Root>
      <Button
        size="icon"
        variant="ghost"
        className="shrink-0"
        onClick={onDelete}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <TrashIcon />
      </Button>
      <Input
        ref={inputRef}
        className="col-start-2"
        placeholder="Label..."
        value={choice.label}
        onValueChange={(value) => onUpdate({ label: value })}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <Input
        className="col-start-2"
        placeholder="Description..."
        value={choice.description ?? ''}
        onValueChange={(value) => onUpdate({ description: value || undefined })}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export function MultipleChoiceBlockPanel({
  block,
  onBlockUpdate,
  onImageUpload,
}: {
  block: MultipleChoiceBlockType
  onBlockUpdate: (block: Partial<MultipleChoiceBlockType>) => void
  onImageUpload: (file: File) => Promise<string>
}) {
  const blockInfo = getBlockInfo(block.type)
  const options = block.properties.options

  const choiceInputRefs = React.useRef<Map<string, HTMLInputElement>>(new Map())

  const handleChoiceUpdate = (choiceId: string, updates: Partial<Choice>) => {
    onBlockUpdate({
      properties: {
        ...block.properties,
        options: options.map((c) => (c.id === choiceId ? { ...c, ...updates } : c)),
      },
    })
  }

  const handleChoiceDelete = (choiceId: string) => {
    onBlockUpdate({
      properties: {
        ...block.properties,
        options: options.filter((c) => c.id !== choiceId),
      },
    })
  }

  const handleChoiceAdd = () => {
    const id = ulid()
    onBlockUpdate({
      properties: {
        ...block.properties,
        options: [
          ...options,
          {
            id,
            label: `Choice ${options.length + 1}`,
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
    onBlockUpdate({
      properties: {
        ...block.properties,
        options: newChoices,
      },
    })
  }

  return (
    <Panel>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>{blockInfo?.name}</Pane.Title>
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
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Choices</Pane.GroupLabel>
              <Button size="icon" variant="ghost" onClick={handleChoiceAdd}>
                <PlusIcon />
              </Button>
            </Pane.GroupHeader>
            <DragDropProvider onDragEnd={(event) => handleChoicesReorder(move(options, event))}>
              <div className="flex flex-col gap-4">
                {options.map((choice, index) => (
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
                  value={block.properties.multiple ?? false}
                  onValueChange={(value: boolean) =>
                    onBlockUpdate({ properties: { ...block.properties, multiple: value } })
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
