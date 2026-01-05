import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { PictureChoiceBlock as PictureChoiceBlockType } from '@shopfunnel/core/quiz/types'
import {
  IconGripVertical as GripVerticalIcon,
  IconPhoto as PhotoIcon,
  IconPlus as PlusIcon,
  IconTrash as TrashIcon,
} from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { Field } from '../field'
import { Pane } from '../pane'
import { Panel } from '../panel'

type Choice = PictureChoiceBlockType['properties']['options'][number]

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

  const handleImageClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const url = await onImageUpload(file)
        onUpdate({ media: { type: 'image', value: url } })
      }
    }
    input.click()
  }

  return (
    <div
      ref={ref}
      className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-1 rounded-lg border border-border bg-card p-2"
    >
      <button
        ref={handleRef}
        type="button"
        className="h-8 cursor-grab touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <Button variant="outline" size="icon" className="overflow-hidden p-0" onClick={handleImageClick}>
        {choice.media?.value ? (
          <img src={choice.media.value} alt="" className="size-full object-cover" />
        ) : (
          <PhotoIcon />
        )}
      </Button>
      <Input
        ref={inputRef}
        placeholder="Choice..."
        value={choice.label}
        onValueChange={(value) => onUpdate({ label: value })}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <Button
        size="icon"
        variant="ghost"
        className="shrink-0"
        onClick={onDelete}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <TrashIcon />
      </Button>
      <div />
      <Input
        className="col-span-2"
        placeholder="Description..."
        value={choice.description ?? ''}
        onValueChange={(value) => onUpdate({ description: value || undefined })}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <div />
    </div>
  )
}

export function PictureChoiceBlockPanel({
  block,
  onBlockUpdate,
  onImageUpload,
}: {
  block: PictureChoiceBlockType
  onBlockUpdate: (block: Partial<PictureChoiceBlockType>) => void
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
              <div className="flex flex-col gap-2">
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
            {options.length === 0 && (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">No options yet</div>
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
