import { Switch } from '@/components/ui/switch'
import type { ShortTextBlock } from '@shopfunnel/core/funnel/schema'
import { createServerFn } from '@tanstack/react-start'
import { Field } from './field'
import { Input } from './input'
import { PaneContent, PaneHeader, PaneRoot, PaneTitle } from './pane'

const fn = createServerFn({ method: 'POST' }).handler(({ data }) => {})

interface ShortTextPaneProps {
  block: ShortTextBlock
  onUpdate: (updates: Partial<ShortTextBlock>) => void
}

export function ShortTextPane({ block, onUpdate }: ShortTextPaneProps) {
  return (
    <form action={fn.url} method="post" encType="multipart/form-data">
      <PaneRoot>
        <PaneHeader>
          <PaneTitle>Question</PaneTitle>
        </PaneHeader>
        <PaneContent>
          <Field.Root>
            <Input
              placeholder="Your question here..."
              value={block.properties.label}
              onValueChange={(value) => onUpdate({ properties: { ...block.properties, label: value } })}
            />
          </Field.Root>
        </PaneContent>
      </PaneRoot>

      <PaneRoot>
        <PaneHeader>
          <PaneTitle>Description</PaneTitle>
        </PaneHeader>
        <PaneContent>
          <Input
            placeholder="Enter description..."
            value={block.properties.description ?? ''}
            onValueChange={(value) =>
              onUpdate({
                properties: { ...block.properties, description: value || undefined },
              })
            }
          />
        </PaneContent>
      </PaneRoot>

      <PaneRoot>
        <PaneHeader>
          <PaneTitle>Validation</PaneTitle>
        </PaneHeader>
        <PaneContent className="gap-2">
          <Field.Root orientation="horizontal">
            <Field.Label htmlFor={`${block.id}-required`}>Required</Field.Label>
            <Switch
              id={`${block.id}-required`}
              checked={block.validations.required ?? false}
              onCheckedChange={(required) =>
                onUpdate({
                  validations: { ...block.validations, required },
                })
              }
            />
          </Field.Root>
          <Field.Root orientation="horizontal">
            <Field.Label htmlFor={`${block.id}-email`}>Email</Field.Label>
            <Switch
              id={`${block.id}-email`}
              checked={block.validations.email ?? false}
              onCheckedChange={(email) =>
                onUpdate({
                  validations: { ...block.validations, email },
                })
              }
            />
          </Field.Root>
          {block.validations.email === false && (
            <Field.Root>
              <Field.Label>Max length</Field.Label>
              <Input
                value={block.validations.maxLength?.toString() ?? ''}
                placeholder="No limit"
                onValueChange={(value) => {
                  onUpdate({
                    validations: {
                      ...block.validations,
                      maxLength: isNaN(parseInt(value, 10)) ? undefined : parseInt(value, 10),
                    },
                  })
                }}
              />
            </Field.Root>
          )}
        </PaneContent>
      </PaneRoot>
    </form>
  )
}
