import { cn } from '@/lib/utils'
import { Button as BaseButton } from '@base-ui/react/button'
import { Form as BaseForm } from '@base-ui/react/form'
import type { Page } from '@shopfunnel/core/form/types'
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
  return (
    <BaseForm
      className="mx-auto flex w-full max-w-md flex-1 flex-col px-8 py-11"
      errors={props.mode === 'live' ? props.errors : undefined}
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
                    'before:absolute before:-inset-3 before:rounded-lg before:border before:border-transparent before:ring-3 before:ring-transparent before:transition-all hover:before:border-(--sf-color-primary)/50 hover:before:ring-(--sf-color-primary)/20',
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
              static={props.mode !== 'live'}
              block={block}
              index={index}
              value={props.mode === 'live' ? props.values[block.id] : undefined}
              onValueChange={props.mode === 'live' ? (value) => props.onBlockValueChange?.(block.id, value) : undefined}
            />
          </div>
        ))}
      </div>
      {props.page.properties.showButton && (
        <BaseButton
          className={cn(
            'h-12 rounded-(--sf-radius) text-base font-semibold transition-all outline-none not-first:mt-6',
            'bg-(--sf-color-primary) text-(--sf-color-primary-foreground) hover:bg-(--sf-color-primary)/90',
            'focus:ring-2 focus:ring-(--sf-color-primary) focus:ring-offset-2',
            props.mode !== 'live' && 'pointer-events-none',
          )}
          disabled={props.mode !== 'live'}
          onClick={props.mode === 'live' ? props.onButtonClick : undefined}
        >
          {props.page.properties.buttonText}
        </BaseButton>
      )}
    </BaseForm>
  )
}
