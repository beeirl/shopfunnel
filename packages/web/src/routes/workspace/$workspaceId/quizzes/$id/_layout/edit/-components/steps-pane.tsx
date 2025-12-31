import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { Step } from '@shopfunnel/core/quiz/types'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import { AddStepDialog } from './add-step-dialog'
import { Pane } from './pane'

function StepItem({
  step,
  index,
  selected,
  onSelect,
  onDelete,
}: {
  step: Step
  index: number
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const { ref } = useSortable({ id: step.id, index })

  return (
    <div
      ref={ref}
      onClick={onSelect}
      className={cn(
        'group flex cursor-grab flex-col rounded-lg border border-border bg-background transition-all hover:border-ring/50',
        selected && 'border-ring ring-3 ring-ring/50 hover:border-ring',
      )}
    >
      <div className="px-1 pt-1">
        <div className="flex aspect-video items-center justify-center rounded-md bg-muted">
          <span className="text-xs font-semibold text-card-foreground">
            {step.blocks.length} {step.blocks.length === 1 ? 'block' : 'blocks'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between px-2.5 py-1">
        <span className="text-xs">Step {index + 1}</span>
        <AlertDialog.Root>
          <AlertDialog.Trigger
            render={
              <Button className="opacity-0 group-hover:opacity-100" size="icon-sm" variant="ghost">
                <TrashIcon />
              </Button>
            }
          />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Title>Delete step?</AlertDialog.Title>
              <AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action variant="destructive" onClick={onDelete}>
                Delete
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
    </div>
  )
}

export function StepsPane({
  steps,
  selectedStepId,
  onStepSelect,
  onStepsReorder,
  onStepAdd,
  onStepDelete,
}: {
  steps: Step[]
  selectedStepId: string | null
  onStepSelect: (stepId: string) => void
  onStepsReorder: (steps: Step[]) => void
  onStepAdd: (step: Step) => void
  onStepDelete: (stepId: string) => void
}) {
  return (
    <Pane.Root className="h-full">
      <Pane.Header>
        <Pane.Title>Steps</Pane.Title>
        <AddStepDialog.Root onStepAdd={onStepAdd}>
          <AddStepDialog.Trigger render={<Button className="-mr-2" size="icon" variant="ghost" />}>
            <PlusIcon />
          </AddStepDialog.Trigger>
          <AddStepDialog.Popup />
        </AddStepDialog.Root>
      </Pane.Header>
      <Pane.Content>
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-sm text-muted-foreground">No steps yet</span>
          </div>
        ) : (
          <DragDropProvider onDragEnd={(event) => onStepsReorder(move(steps, event))}>
            <Pane.Group className="flex flex-col gap-2">
              {steps.map((step, index) => (
                <StepItem
                  key={step.id}
                  step={step}
                  index={index}
                  selected={selectedStepId === step.id}
                  onSelect={() => onStepSelect(step.id)}
                  onDelete={() => onStepDelete(step.id)}
                />
              ))}
            </Pane.Group>
          </DragDropProvider>
        )}
      </Pane.Content>
    </Pane.Root>
  )
}
