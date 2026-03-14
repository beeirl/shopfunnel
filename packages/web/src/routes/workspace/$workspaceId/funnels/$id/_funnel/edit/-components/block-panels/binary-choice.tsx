import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/color-picker'
import { Input } from '@/components/ui/input'
import { InputGroup } from '@/components/ui/input-group'
import type { BinaryChoiceBlock as BinaryChoiceBlockType, Theme } from '@shopfunnel/core/funnel/types'
import { IconPlus as PlusIcon } from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { Field } from '../field'
import { Pane } from '../pane'
import { Panel } from '../panel'

type Choice = BinaryChoiceBlockType['properties']['options'][number]

export function BinaryChoiceBlockPanel({
  block,
  theme,
  onBlockUpdate,
}: {
  block: BinaryChoiceBlockType
  theme: Theme
  onBlockUpdate: (block: Partial<BinaryChoiceBlockType>) => void
}) {
  const blockInfo = getBlockInfo(block.type)
  const options = block.properties.options

  const handleChoiceUpdate = (choiceId: string, updates: Partial<Choice>) => {
    onBlockUpdate({
      properties: {
        ...block.properties,
        options: options.map((c) => (c.id === choiceId ? { ...c, ...updates } : c)),
      },
    })
  }

  const handleChoiceAdd = () => {
    onBlockUpdate({
      properties: {
        ...block.properties,
        options: [
          ...options,
          {
            id: ulid(),
            label: `Choice ${options.length + 1}`,
          },
        ],
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
              <Pane.GroupLabel>Label</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Input
              placeholder="Label..."
              value={block.properties.label || ''}
              onValueChange={(value) =>
                onBlockUpdate({ properties: { ...block.properties, label: value || undefined } })
              }
            />
          </Pane.Group>
          <Pane.Separator />
          {options.map((choice, index) => (
            <React.Fragment key={choice.id}>
              {index > 0 && <Pane.Separator />}
              <Pane.Group>
                <Pane.GroupHeader>
                  <Pane.GroupLabel>Choice {index + 1}</Pane.GroupLabel>
                  {index === 0 && options.length < 2 && (
                    <Button size="icon" variant="ghost" onClick={handleChoiceAdd}>
                      <PlusIcon />
                    </Button>
                  )}
                </Pane.GroupHeader>
                <Field.Root>
                  <Field.Label>Label</Field.Label>
                  <Field.Control>
                    <Input
                      placeholder="Label..."
                      value={choice.label}
                      onValueChange={(value) => handleChoiceUpdate(choice.id, { label: value })}
                    />
                  </Field.Control>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Background</Field.Label>
                  <Field.Control>
                    <InputGroup.Root>
                      <InputGroup.Addon>
                        <ColorPicker.Root>
                          <ColorPicker.Trigger
                            render={
                              <InputGroup.Button
                                size="icon-xs"
                                variant="outline"
                                style={{ backgroundColor: choice.backgroundColor || theme.colors.primary }}
                              />
                            }
                          />
                          <ColorPicker.Content
                            side="left"
                            value={choice.backgroundColor || theme.colors.primary}
                            onValueChange={(value) => handleChoiceUpdate(choice.id, { backgroundColor: value })}
                          />
                        </ColorPicker.Root>
                      </InputGroup.Addon>
                      <InputGroup.Input
                        value={choice.backgroundColor || theme.colors.primary}
                        onChange={(e) =>
                          handleChoiceUpdate(choice.id, { backgroundColor: e.target.value || undefined })
                        }
                      />
                    </InputGroup.Root>
                  </Field.Control>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Text</Field.Label>
                  <Field.Control>
                    <InputGroup.Root>
                      <InputGroup.Addon>
                        <ColorPicker.Root>
                          <ColorPicker.Trigger
                            render={
                              <InputGroup.Button
                                size="icon-xs"
                                variant="outline"
                                style={{ backgroundColor: choice.foregroundColor || theme.colors.primaryForeground }}
                              />
                            }
                          />
                          <ColorPicker.Content
                            side="left"
                            value={choice.foregroundColor || theme.colors.primaryForeground}
                            onValueChange={(value) => handleChoiceUpdate(choice.id, { foregroundColor: value })}
                          />
                        </ColorPicker.Root>
                      </InputGroup.Addon>
                      <InputGroup.Input
                        value={choice.foregroundColor || theme.colors.primaryForeground}
                        onChange={(e) =>
                          handleChoiceUpdate(choice.id, { foregroundColor: e.target.value || undefined })
                        }
                      />
                    </InputGroup.Root>
                  </Field.Control>
                </Field.Root>
              </Pane.Group>
            </React.Fragment>
          ))}
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
