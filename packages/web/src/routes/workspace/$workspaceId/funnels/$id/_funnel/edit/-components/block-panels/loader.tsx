import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import type { LoaderBlock as LoaderBlockType } from '@shopfunnel/core/funnel/types'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import { Field } from '../field'
import { Pane } from '../pane'
import { Panel } from '../panel'

type StepsVariant = NonNullable<LoaderBlockType['properties']['steps']>['variant'] | 'none'

const STEP_VARIANT_OPTIONS: { value: StepsVariant; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
]

export function LoaderBlockPanel({
  block,
  onBlockUpdate,
}: {
  block: LoaderBlockType
  onBlockUpdate: (block: Partial<LoaderBlockType>) => void
}) {
  const blockInfo = getBlockInfo(block.type)
  const steps = block.properties.steps

  const handleVariantChange = (variant: StepsVariant) => {
    if (variant === 'none') {
      onBlockUpdate({
        properties: { ...block.properties, steps: undefined },
      })
    } else {
      onBlockUpdate({
        properties: {
          ...block.properties,
          steps: {
            variant,
            items: steps?.items ?? ['Step 1'],
          },
        },
      })
    }
  }

  const handleStepAdd = () => {
    if (!steps) return
    onBlockUpdate({
      properties: {
        ...block.properties,
        steps: { ...steps, items: [...steps.items, `Step ${steps.items.length + 1}`] },
      },
    })
  }

  const handleStepUpdate = (index: number, value: string) => {
    if (!steps) return
    const newItems = [...steps.items]
    newItems[index] = value
    onBlockUpdate({
      properties: { ...block.properties, steps: { ...steps, items: newItems } },
    })
  }

  const handleStepDelete = (index: number) => {
    if (!steps) return
    const newItems = steps.items.filter((_, i) => i !== index)
    onBlockUpdate({
      properties: { ...block.properties, steps: { ...steps, items: newItems } },
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
            <Field.Root>
              <Field.Label>Duration</Field.Label>
              <Field.Control>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  placeholder="3000"
                  value={block.properties.duration ?? ''}
                  onValueChange={(value) => {
                    const parsed = parseFloat(value)
                    onBlockUpdate({
                      properties: {
                        ...block.properties,
                        duration: Number.isNaN(parsed) ? undefined : parsed,
                      },
                    })
                  }}
                />
              </Field.Control>
            </Field.Root>
            <Field.Root>
              <Field.Label>Show progress</Field.Label>
              <Field.Control>
                <SegmentedControl.Root
                  value={block.properties.showProgress ?? true}
                  onValueChange={(value: boolean) =>
                    onBlockUpdate({ properties: { ...block.properties, showProgress: value } })
                  }
                >
                  <SegmentedControl.Segment value={true}>Yes</SegmentedControl.Segment>
                  <SegmentedControl.Segment value={false}>No</SegmentedControl.Segment>
                </SegmentedControl.Root>
              </Field.Control>
            </Field.Root>
          </Pane.Group>
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Steps</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Select.Root
              items={STEP_VARIANT_OPTIONS}
              value={steps?.variant ?? 'none'}
              onValueChange={handleVariantChange}
            >
              <Select.Trigger className="w-full">
                <Select.Value />
              </Select.Trigger>
              <Select.Content alignItemWithTrigger={false}>
                <Select.Group>
                  {STEP_VARIANT_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
            {steps && (
              <div className="mt-3 flex flex-col gap-2">
                {steps.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <Input
                      className="flex-1"
                      placeholder="Step text..."
                      value={item}
                      onValueChange={(value) => handleStepUpdate(index, value)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleStepDelete(index)}>
                      <TrashIcon />
                    </Button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" onClick={handleStepAdd}>
                  <PlusIcon />
                  Add step
                </Button>
              </div>
            )}
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
