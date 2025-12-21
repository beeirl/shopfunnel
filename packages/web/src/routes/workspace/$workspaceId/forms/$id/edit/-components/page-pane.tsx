import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { Page } from '@shopfunnel/core/form/schema'
import { Field } from './field'
import { Pane } from './pane'

export function PagePane({
  pageSchema,
  pageIndex,
  onPageSchemaUpdate,
}: {
  pageSchema: Page
  pageIndex: number
  onPageSchemaUpdate: (updates: Partial<Page>) => void
}) {
  return (
    <Pane.Root>
      <Pane.Header>
        <Pane.Title>Page {pageIndex + 1}</Pane.Title>
      </Pane.Header>
      <Pane.Content>
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Button</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Field.Root>
            <Field.Label>Show</Field.Label>
            <Field.Control>
              <SegmentedControl.Root
                value={pageSchema.properties.showButton}
                onValueChange={(value: boolean) =>
                  onPageSchemaUpdate({ properties: { ...pageSchema.properties, showButton: value } })
                }
              >
                <SegmentedControl.Segment value={false}>No</SegmentedControl.Segment>
                <SegmentedControl.Segment value={true}>Yes</SegmentedControl.Segment>
              </SegmentedControl.Root>
            </Field.Control>
          </Field.Root>
          {pageSchema.properties.showButton && (
            <>
              <Field.Root>
                <Field.Label>Text</Field.Label>
                <Field.Control>
                  <Input
                    value={pageSchema.properties.buttonText}
                    onValueChange={(value) =>
                      onPageSchemaUpdate({ properties: { ...pageSchema.properties, buttonText: value } })
                    }
                  />
                </Field.Control>
              </Field.Root>
              <Field.Root>
                <Field.Label>Action</Field.Label>
                <Field.Control>
                  <SegmentedControl.Root
                    value={pageSchema.properties.buttonAction}
                    onValueChange={(value: 'next' | 'redirect') =>
                      onPageSchemaUpdate({ properties: { ...pageSchema.properties, buttonAction: value } })
                    }
                  >
                    <SegmentedControl.Segment value="next">Next</SegmentedControl.Segment>
                    <SegmentedControl.Segment value="redirect">Redirect</SegmentedControl.Segment>
                  </SegmentedControl.Root>
                </Field.Control>
              </Field.Root>
              {pageSchema.properties.buttonAction === 'redirect' && (
                <Field.Root>
                  <Field.Label>URL</Field.Label>
                  <Field.Control>
                    <Input
                      placeholder="https://..."
                      value={pageSchema.properties.redirectUrl ?? ''}
                      onValueChange={(value) =>
                        onPageSchemaUpdate({
                          properties: { ...pageSchema.properties, redirectUrl: value || undefined },
                        })
                      }
                    />
                  </Field.Control>
                </Field.Root>
              )}
            </>
          )}
        </Pane.Group>
      </Pane.Content>
    </Pane.Root>
  )
}
