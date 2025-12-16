import type { SliderBlock } from '@shopfunnel/core/funnel/schema'

import { Field } from '@/funnel/components/field'

export type SliderProps =
  | {
      mode: 'preview'
      block: SliderBlock
    }
  | {
      mode: 'live'
      block: SliderBlock
      value?: number
      onChange?: (value: number) => void
    }

export function Slider(props: SliderProps) {
  return (
    <Field mode={props.mode} label={props.block.properties.label} description={props.block.properties.description}>
      <div className="flex h-12 items-center justify-center rounded-[var(--radius)] bg-muted text-sm text-muted-foreground">
        Slider block
      </div>
    </Field>
  )
}
