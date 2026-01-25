import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DropdownBlock as DropdownBlockType } from '@shopfunnel/core/funnel/types'
import { IconGripVertical as GripVerticalIcon, IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { Field } from '../field'
import { Pane } from '../pane'
import { Panel } from '../panel'

type Option = DropdownBlockType['properties']['options'][number]

function OptionItem({
  option,
  inputRef,
  onUpdate,
  onDelete,
}: {
  option: Option
  inputRef: (el: HTMLInputElement | null) => void
  onUpdate: (updates: Partial<Option>) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: option.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <Input
        ref={inputRef}
        className="flex-1"
        placeholder="Option label..."
        value={option.label}
        onValueChange={(value) => onUpdate({ label: value })}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <Button size="icon" variant="ghost" onClick={onDelete} onPointerDown={(e) => e.stopPropagation()}>
        <TrashIcon />
      </Button>
    </div>
  )
}

export function DropdownBlockPanel({
  block,
  onBlockUpdate,
  onBlockRemove,
}: {
  block: DropdownBlockType
  onBlockUpdate: (block: Partial<DropdownBlockType>) => void
  onBlockRemove: () => void
}) {
  const blockInfo = getBlockInfo(block.type)
  const options = block.properties.options

  const optionInputRefs = React.useRef<Map<string, HTMLInputElement>>(new Map())
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleOptionUpdate = (optionId: string, updates: Partial<Option>) => {
    onBlockUpdate({
      properties: {
        ...block.properties,
        options: options.map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
      },
    })
  }

  const handleOptionDelete = (optionId: string) => {
    onBlockUpdate({
      properties: {
        ...block.properties,
        options: options.filter((o) => o.id !== optionId),
      },
    })
  }

  const handleOptionAdd = () => {
    const id = ulid()
    onBlockUpdate({
      properties: {
        ...block.properties,
        options: [
          ...options,
          {
            id,
            label: `Option ${options.length + 1}`,
          },
        ],
      },
    })
    requestAnimationFrame(() => {
      const input = optionInputRefs.current.get(id)
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
          <Pane.Separator />
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
              <Button size="icon" variant="ghost" onClick={handleOptionAdd}>
                <PlusIcon />
              </Button>
            </Pane.GroupHeader>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={options} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1">
                  {options.map((option) => (
                    <OptionItem
                      key={option.id}
                      option={option}
                      inputRef={(el) => {
                        if (el) optionInputRefs.current.set(option.id, el)
                        else optionInputRefs.current.delete(option.id)
                      }}
                      onUpdate={(updates) => handleOptionUpdate(option.id, updates)}
                      onDelete={() => handleOptionDelete(option.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {options.length === 0 && (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">No options yet</div>
            )}
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
