import { Form as BaseForm } from '@base-ui/react/form'
import type { Page } from '@shopfunnel/core/form/types'
import { FormBlock } from './block'
import { Button } from './components/button'

export interface FormPageProps {
  static?: boolean
  page: Page
  values?: Record<string, unknown>
  errors?: Record<string, string>
  onButtonClick?: () => void
  onBlockValueChange?: (id: string, value: unknown) => void
}

export function FormPage(props: FormPageProps) {
  return (
    <BaseForm
      className="mx-auto flex w-full max-w-md flex-1 flex-col px-8 py-11"
      errors={props.errors}
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div className="flex-1">
        {props.page.blocks.map((block) => (
          <FormBlock
            key={block.id}
            static={props.static}
            block={block}
            value={props.values?.[block.id]}
            onValueChange={props.static ? undefined : (value) => props.onBlockValueChange?.(block.id, value)}
          />
        ))}
      </div>
      {props.page.properties.showButton && (
        <Button static={props.static} onClick={props.static ? undefined : props.onButtonClick}>
          {props.page.properties.buttonText}
        </Button>
      )}
    </BaseForm>
  )
}
