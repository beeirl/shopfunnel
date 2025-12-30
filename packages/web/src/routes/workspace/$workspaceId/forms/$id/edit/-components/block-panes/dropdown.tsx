import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { DropdownBlock as DropdownBlockData } from '@shopfunnel/core/form/types'
import { IconGripVertical as GripVerticalIcon, IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { Field } from '../field'
import { Pane } from '../pane'

type Option = DropdownBlockData['properties']['options'][number]

function OptionItem({
  option,
  index,
  inputRef,
  onUpdate,
  onDelete,
}: {
  option: Option
  index: number
  inputRef: (el: HTMLInputElement | null) => void
  onUpdate: (updates: Partial<Option>) => void
  onDelete: () => void
}) {
  const { ref, handleRef } = useSortable({ id: option.id, index })

  return (
    <div ref={ref} className="flex items-center gap-1">
      <button
        ref={handleRef}
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
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

export function DropdownBlockPane({
  data,
  onDataUpdate,
}: {
  data: DropdownBlockData
  onDataUpdate: (data: Partial<DropdownBlockData>) => void
}) {
  const block = getBlockInfo(data.type)
  const options = data.properties.options

  const optionInputRefs = React.useRef<Map<string, HTMLInputElement>>(new Map())

  const handleOptionUpdate = (optionId: string, updates: Partial<Option>) => {
    onDataUpdate({
      properties: {
        ...data.properties,
        options: options.map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
      },
    })
  }

  const handleOptionDelete = (optionId: string) => {
    onDataUpdate({
      properties: {
        ...data.properties,
        options: options.filter((o) => o.id !== optionId),
      },
    })
  }

  const handleOptionAdd = () => {
    const id = ulid()
    onDataUpdate({
      properties: {
        ...data.properties,
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

  const handleOptionsReorder = (newOptions: Option[]) => {
    onDataUpdate({
      properties: {
        ...data.properties,
        options: newOptions,
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
            <Pane.GroupLabel>Name</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Input
            placeholder="Enter name..."
            value={data.properties.name}
            onValueChange={(value) => onDataUpdate({ properties: { ...data.properties, name: value } })}
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
          <DragDropProvider onDragEnd={(event) => handleOptionsReorder(move(options, event))}>
            <div className="flex flex-col gap-1">
              {options.map((option, index) => (
                <OptionItem
                  key={option.id}
                  option={option}
                  index={index}
                  inputRef={(el) => {
                    if (el) optionInputRefs.current.set(option.id, el)
                    else optionInputRefs.current.delete(option.id)
                  }}
                  onUpdate={(updates) => handleOptionUpdate(option.id, updates)}
                  onDelete={() => handleOptionDelete(option.id)}
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
            <Field.Label>Required</Field.Label>
            <Field.Control>
              <SegmentedControl.Root
                value={data.validations.required ?? false}
                onValueChange={(value: boolean) =>
                  onDataUpdate({ validations: { ...data.validations, required: value } })
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
