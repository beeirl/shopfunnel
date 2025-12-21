import type { SliderBlock } from '@shopfunnel/core/form/schema'

import { Field } from '@/form/components/field'

export type SliderProps =
  | {
      mode: 'preview'
      schema: SliderBlock
    }
  | {
      mode: 'live'
      schema: SliderBlock
      value?: number
      onChange?: (value: number) => void
    }

export function Slider(props: SliderProps) {
  return (
    <Field mode={props.mode} label={props.schema.properties.label} description={props.schema.properties.description}>
      <div className="flex h-12 items-center justify-center rounded-(--radius) bg-muted text-sm text-muted-foreground">
        Slider block
      </div>
    </Field>
  )
}
