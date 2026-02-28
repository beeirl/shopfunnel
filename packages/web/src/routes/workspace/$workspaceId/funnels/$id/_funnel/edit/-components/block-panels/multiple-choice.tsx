import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MultipleChoiceBlock as MultipleChoiceBlockType } from '@shopfunnel/core/funnel/types'
import { IconGripVertical as GripVerticalIcon, IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { Field } from '../field'
import { MediaPicker } from '../media-picker'
import { Pane } from '../pane'
import { Panel } from '../panel'

type Choice = MultipleChoiceBlockType['properties']['options'][number]

function ChoiceItem({
  choice,
  inputRef,
  onUpdate,
  onDelete,
  onImageUpload,
}: {
  choice: Choice
  inputRef: (el: HTMLInputElement | null) => void
  onUpdate: (updates: Partial<Choice>) => void
  onDelete: () => void
  onImageUpload: (file: File) => Promise<string>
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: choice.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="grid grid-cols-[auto_1fr_auto] items-center gap-1">
      <button
        type="button"
        className="cursor-grab touch-none pr-1 text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <MediaPicker.Root
        value={choice.media}
        onValueChange={async (type, value) => {
          if (type === 'emoji' && typeof value === 'string') {
            onUpdate({ media: { type: 'emoji', value } })
          } else if (type === 'image' && value instanceof File) {
            const url = await onImageUpload(value)
            onUpdate({ media: { type: 'image', value: url } })
          } else {
            onUpdate({ media: undefined })
          }
        }}
      >
        <MediaPicker.Trigger nativeButton={false} render={<MediaPicker.Input />} />
        <MediaPicker.Content side="left" align="start">
          <MediaPicker.Tabs>
            <MediaPicker.TabList>
              <MediaPicker.EmojiTab />
              <MediaPicker.ImageTab />
            </MediaPicker.TabList>
            <MediaPicker.EmojiTabContent>
              <MediaPicker.EmojiPicker />
            </MediaPicker.EmojiTabContent>
            <MediaPicker.ImageTabContent>
              <MediaPicker.ImagePicker />
            </MediaPicker.ImageTabContent>
          </MediaPicker.Tabs>
        </MediaPicker.Content>
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = options.findIndex((o) => o.id === active.id)
      const newIndex = options.findIndex((o) => o.id === over.id)
      onBlockUpdate({
        properties: {
          ...block.properties,
          options: arrayMove(options, oldIndex, newIndex),
        },
      })
    }
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
              <Pane.GroupLabel>Choices</Pane.GroupLabel>
              <Button size="icon" variant="ghost" onClick={handleChoiceAdd}>
                <PlusIcon />
              </Button>
            </Pane.GroupHeader>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={options} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-4">
                  {options.map((choice) => (
                    <ChoiceItem
                      key={choice.id}
                      choice={choice}
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
              </SortableContext>
            </DndContext>
          </Pane.Group>
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Options</Pane.GroupLabel>
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
