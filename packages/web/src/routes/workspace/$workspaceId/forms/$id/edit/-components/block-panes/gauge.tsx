import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GaugeBlock as GaugeBlockData } from '@shopfunnel/core/form/types'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import * as React from 'react'
import { Field } from '../field'
import { Pane } from '../pane'

export function GaugeBlockPane({
  data,
  onDataUpdate,
}: {
  data: GaugeBlockData
  onDataUpdate: (data: Partial<GaugeBlockData>) => void
}) {
  const block = getBlockInfo(data.type)
  const marks = data.properties.marks ?? []

  const markInputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map())

  const handleMarkUpdate = (index: number, value: string) => {
    const newMarks = [...marks]
    newMarks[index] = value
    onDataUpdate({
      properties: { ...data.properties, marks: newMarks },
    })
  }

  const handleMarkDelete = (index: number) => {
    const newMarks = marks.filter((_, i) => i !== index)
    onDataUpdate({
      properties: { ...data.properties, marks: newMarks.length > 0 ? newMarks : undefined },
    })
  }

  const handleMarkAdd = () => {
    const newIndex = marks.length
    onDataUpdate({
      properties: { ...data.properties, marks: [...marks, `Mark ${newIndex + 1}`] },
    })
    requestAnimationFrame(() => {
      const input = markInputRefs.current.get(newIndex)
      input?.focus()
      input?.select()
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
            <Pane.GroupLabel>Tooltip</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Input
            placeholder="Tooltip label..."
            value={data.properties.tooltipLabel ?? ''}
            onValueChange={(value) =>
              onDataUpdate({
                properties: { ...data.properties, tooltipLabel: value || undefined },
              })
            }
          />
        </Pane.Group>
        <Pane.Separator />
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Value</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Field.Root>
            <Field.Label>Current Value</Field.Label>
            <Field.Control>
              <Input
                type="number"
                value={data.properties.value}
                onValueChange={(value) =>
                  onDataUpdate({
                    properties: { ...data.properties, value: parseFloat(value) || 0 },
                  })
                }
              />
            </Field.Control>
          </Field.Root>
          <Field.Root>
            <Field.Label>Min Value</Field.Label>
            <Field.Control>
              <Input
                type="number"
                value={data.properties.minValue ?? 0}
                onValueChange={(value) =>
                  onDataUpdate({
                    properties: { ...data.properties, minValue: parseFloat(value) || 0 },
                  })
                }
              />
            </Field.Control>
          </Field.Root>
          <Field.Root>
            <Field.Label>Max Value</Field.Label>
            <Field.Control>
              <Input
                type="number"
                value={data.properties.maxValue ?? 10}
                onValueChange={(value) =>
                  onDataUpdate({
                    properties: { ...data.properties, maxValue: parseFloat(value) || 10 },
                  })
                }
              />
            </Field.Control>
          </Field.Root>
        </Pane.Group>
        <Pane.Separator />
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Marks</Pane.GroupLabel>
            <Button size="icon" variant="ghost" onClick={handleMarkAdd}>
              <PlusIcon />
            </Button>
          </Pane.GroupHeader>
          {marks.length > 0 && (
            <div className="flex flex-col gap-1">
              {marks.map((mark, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Input
                    ref={(el) => {
                      if (el) markInputRefs.current.set(index, el)
                      else markInputRefs.current.delete(index)
                    }}
                    placeholder="Mark label..."
                    value={mark}
                    onValueChange={(value) => handleMarkUpdate(index, value)}
                  />
                  <Button size="icon" variant="ghost" onClick={() => handleMarkDelete(index)}>
                    <TrashIcon />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Pane.Group>
      </Pane.Content>
    </Pane.Root>
  )
}
