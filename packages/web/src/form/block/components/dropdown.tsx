import { Select as BaseSelect } from '@base-ui/react/select'
import type { DropdownBlock } from '@shopfunnel/core/form/schema'
import { IconCheck as CheckIcon, IconChevronDown as ChevronDownIcon } from '@tabler/icons-react'

import { Field } from '@/form/components/field'
import { cn } from '@/lib/utils'

export type DropdownProps =
  | {
      mode: 'preview'
      schema: DropdownBlock
    }
  | {
      mode: 'live'
      schema: DropdownBlock
      value?: string
      onChange?: (value: string) => void
    }

const triggerClassName =
  'flex w-full items-center justify-between rounded-[var(--radius)] border-2 border-border bg-background px-4 py-3 text-left text-lg text-foreground'
const iconClassName = 'size-3.5 text-muted-foreground'

export function Dropdown(props: DropdownProps) {
  const options = props.schema.properties.options.map((option) => ({
    id: option.id,
    label: option.label,
    value: option.id,
  }))

  return (
    <Field mode={props.mode} label={props.schema.properties.label} description={props.schema.properties.description}>
      {props.mode === 'preview' ? (
        <div className={triggerClassName}>
          <span className="text-muted-foreground">Select an option...</span>
          <ChevronDownIcon className={iconClassName} />
        </div>
      ) : (
        <BaseSelect.Root items={options} value={props.value} onValueChange={props.onChange}>
          <BaseSelect.Trigger
            className={cn(triggerClassName, 'transition-colors focus:border-primary focus:outline-none')}
          >
            <BaseSelect.Value />
            <BaseSelect.Icon className="transition-transform">
              <ChevronDownIcon className={iconClassName} />
            </BaseSelect.Icon>
          </BaseSelect.Trigger>
          <BaseSelect.Portal>
            <BaseSelect.Positioner className="z-50 outline-none" sideOffset={4} alignItemWithTrigger={false}>
              <BaseSelect.Popup className="group max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-(--radius) border border-border bg-background bg-clip-padding py-1 text-foreground shadow-lg shadow-border transition-[transform,scale,opacity]">
                <BaseSelect.List className="max-h-60 overflow-y-auto">
                  {options.map((option) => (
                    <BaseSelect.Item
                      key={option.id}
                      value={option.id}
                      className="grid cursor-default scroll-my-1 grid-cols-[1fr_0.75rem] items-center gap-2 py-3.5 pr-5.5 pl-4.5 leading-4 outline-none select-none"
                    >
                      <BaseSelect.ItemText className="col-start-1">{option.label}</BaseSelect.ItemText>
                      <BaseSelect.ItemIndicator className="col-start-2">
                        <CheckIcon />
                      </BaseSelect.ItemIndicator>
                    </BaseSelect.Item>
                  ))}
                </BaseSelect.List>
              </BaseSelect.Popup>
            </BaseSelect.Positioner>
          </BaseSelect.Portal>
        </BaseSelect.Root>
      )}
    </Field>
  )
}
