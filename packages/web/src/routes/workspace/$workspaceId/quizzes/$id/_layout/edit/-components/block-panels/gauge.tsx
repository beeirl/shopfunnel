import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GaugeBlock as GaugeBlockType } from '@shopfunnel/core/quiz/types'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import * as React from 'react'
import { Field } from '../field'
import { Pane } from '../pane'
import { Panel } from '../panel'

export function GaugeBlockPanel({
  block,
  onBlockUpdate,
}: {
  block: GaugeBlockType
  onBlockUpdate: (block: Partial<GaugeBlockType>) => void
}) {
  const blockInfo = getBlockInfo(block.type)
  const marks = block.properties.marks ?? []

  const markInputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map())

  const handleMarkUpdate = (index: number, value: string) => {
    const newMarks = [...marks]
    newMarks[index] = value
    onBlockUpdate({
      properties: { ...block.properties, marks: newMarks },
    })
  }

  const handleMarkDelete = (index: number) => {
    const newMarks = marks.filter((_, i) => i !== index)
    onBlockUpdate({
      properties: { ...block.properties, marks: newMarks.length > 0 ? newMarks : undefined },
    })
  }

  const handleMarkAdd = () => {
    const newIndex = marks.length
    onBlockUpdate({
      properties: { ...block.properties, marks: [...marks, `Mark ${newIndex + 1}`] },
    })
    requestAnimationFrame(() => {
      const input = markInputRefs.current.get(newIndex)
      input?.focus()
      input?.select()
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
              <Pane.GroupLabel>Tooltip</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Input
              placeholder="Tooltip label..."
              value={block.properties.tooltipLabel ?? ''}
              onValueChange={(value) =>
                onBlockUpdate({
                  properties: { ...block.properties, tooltipLabel: value || undefined },
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
                  value={block.properties.value}
                  onValueChange={(value) =>
                    onBlockUpdate({
                      properties: { ...block.properties, value: parseFloat(value) || 0 },
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
                  value={block.properties.minValue ?? 0}
                  onValueChange={(value) =>
                    onBlockUpdate({
                      properties: { ...block.properties, minValue: parseFloat(value) || 0 },
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
                  value={block.properties.maxValue ?? 10}
                  onValueChange={(value) =>
                    onBlockUpdate({
                      properties: { ...block.properties, maxValue: parseFloat(value) || 10 },
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
    </Panel>
  )
}
