import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { Step } from '@shopfunnel/core/quiz/types'
import { Field } from './field'
import { Pane } from './pane'

export function StepPane({
  step,
  index,
  onStepUpdate,
}: {
  step: Step
  index: number
  onStepUpdate: (step: Partial<Step>) => void
}) {
  return (
    <Pane.Root>
      <Pane.Header>
        <Pane.Title>Step {index + 1}</Pane.Title>
      </Pane.Header>
      <Pane.Content>
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Settings</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Field.Root>
            <Field.Label>Name</Field.Label>
            <Field.Control>
              <Input
                value={step.name ?? `Step ${index + 1}`}
                onValueChange={(value) => onStepUpdate({ name: value })}
              />
            </Field.Control>
          </Field.Root>
        </Pane.Group>
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Button</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Field.Root>
            <Field.Label>Show</Field.Label>
            <Field.Control>
              <SegmentedControl.Root
                value={step.properties.showButton}
                onValueChange={(value: boolean) =>
                  onStepUpdate({ properties: { ...step.properties, showButton: value } })
                }
              >
                <SegmentedControl.Segment value={false}>No</SegmentedControl.Segment>
                <SegmentedControl.Segment value={true}>Yes</SegmentedControl.Segment>
              </SegmentedControl.Root>
            </Field.Control>
          </Field.Root>
          {step.properties.showButton && (
            <>
              <Field.Root>
                <Field.Label>Text</Field.Label>
                <Field.Control>
                  <Input
                    value={step.properties.buttonText}
                    onValueChange={(value) => onStepUpdate({ properties: { ...step.properties, buttonText: value } })}
                  />
                </Field.Control>
              </Field.Root>
              <Field.Root>
                <Field.Label>Action</Field.Label>
                <Field.Control>
                  <SegmentedControl.Root
                    value={step.properties.buttonAction}
                    onValueChange={(value: 'next' | 'redirect') =>
                      onStepUpdate({ properties: { ...step.properties, buttonAction: value } })
                    }
                  >
                    <SegmentedControl.Segment value="next">Next</SegmentedControl.Segment>
                    <SegmentedControl.Segment value="redirect">Redirect</SegmentedControl.Segment>
                  </SegmentedControl.Root>
                </Field.Control>
              </Field.Root>
              {step.properties.buttonAction === 'redirect' && (
                <Field.Root>
                  <Field.Label>URL</Field.Label>
                  <Field.Control>
                    <Input
                      placeholder="https://..."
                      value={step.properties.redirectUrl ?? ''}
                      onValueChange={(value) =>
                        onStepUpdate({
                          properties: { ...step.properties, redirectUrl: value || undefined },
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
