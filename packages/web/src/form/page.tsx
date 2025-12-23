import { cn } from '@/lib/utils'
import { Button as BaseButton } from '@base-ui/react/button'
import { Form as BaseForm } from '@base-ui/react/form'
import type { Page } from '@shopfunnel/core/form/types'
import * as React from 'react'
import { FormBlock } from './block'

type FormPageProps = {
  mode: 'edit' | 'preview' | 'live'
  page: Page
} & (
  | {
      mode: 'edit'
      selectedBlockId: string | null
      onBlockSelect: (id: string | null) => void
    }
  | {
      mode: 'preview' | 'live'
      values: Record<string, unknown>
      errors: Record<string, string>
      onButtonClick?: () => void
      onBlockValueChange?: (id: string, value: unknown) => void
    }
)

export function FormPage(props: FormPageProps) {
  // Check if page has a loader block
  const hasLoader = props.page.blocks.some((block) => block.type === 'loader')

  // Track loader completion state (only relevant in preview/live mode)
  const [loaderComplete, setLoaderComplete] = React.useState(!hasLoader)

  // Reset loaderComplete when page changes or hasLoader changes
  React.useEffect(() => {
    setLoaderComplete(!hasLoader)
  }, [props.page.id, hasLoader])

  // Auto-advance when loader completes and button is not shown
  React.useEffect(() => {
    if (props.mode !== 'edit' && hasLoader && loaderComplete && !props.page.properties.showButton) {
      props.onButtonClick?.()
    }
  }, [props.mode, hasLoader, loaderComplete, props.page.properties.showButton])

  // Button should be disabled if in edit mode, or if there's a loader that hasn't completed
  const isButtonDisabled = props.mode === 'edit' || (hasLoader && !loaderComplete)

  return (
    <BaseForm
      className="mx-auto flex w-full max-w-md flex-1 flex-col px-8 py-11"
      errors={props.mode !== 'edit' ? props.errors : undefined}
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div className="flex-1">
        {props.page.blocks.map((block, index) => (
          <div
            key={block.id}
            className={
              props.mode === 'edit'
                ? cn(
                    'relative cursor-pointer',
                    'before:absolute before:-inset-2 before:rounded-[calc(var(--sf-radius)+4px)] before:border before:border-transparent before:ring-3 before:ring-transparent before:transition-all hover:before:border-(--sf-color-primary)/50 hover:before:ring-(--sf-color-primary)/20',
                    props.selectedBlockId === block.id &&
                      'before:border-(--sf-color-primary)/40 before:ring-(--sf-color-primary)/25',
                  )
                : undefined
            }
            onClick={
              props.mode === 'edit'
                ? (e) => {
                    e.stopPropagation()
                    props.onBlockSelect(block.id)
                  }
                : undefined
            }
          >
            <FormBlock
              static={props.mode === 'edit'}
              block={block}
              index={index}
              value={props.mode !== 'edit' ? props.values[block.id] : undefined}
              onValueChange={props.mode !== 'edit' ? (value) => props.onBlockValueChange?.(block.id, value) : undefined}
              onLoaderComplete={() => setLoaderComplete(true)}
            />
          </div>
        ))}
      </div>
      {props.page.properties.showButton && (
        <BaseButton
          className={cn(
            'h-12 rounded-(--sf-radius) text-base font-semibold transition-all outline-none not-first:mt-6',
            'bg-(--sf-color-primary) text-(--sf-color-primary-foreground) hover:bg-(--sf-color-primary)/90',
            'focus-visible:ring-2 focus-visible:ring-(--sf-color-primary) focus-visible:ring-offset-2',
            isButtonDisabled && 'pointer-events-none opacity-50',
          )}
          disabled={isButtonDisabled}
          onClick={props.mode !== 'edit' ? props.onButtonClick : undefined}
        >
          {props.page.properties.buttonText}
        </BaseButton>
      )}
    </BaseForm>
  )
}
