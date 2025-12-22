import { Field } from '@/form/components/field'
import { cn } from '@/lib/utils'
import { Select as BaseSelect } from '@base-ui/react/select'
import type { DropdownBlock as DropdownBlockData } from '@shopfunnel/core/form/types'
import { IconCheck as CheckIcon, IconChevronDown as ChevronDownIcon } from '@tabler/icons-react'

export interface DropdownBlockProps {
  data: DropdownBlockData
  static?: boolean
  value?: string
  onValueChange?: (value: string) => void
}

export function DropdownBlock(props: DropdownBlockProps) {
  const options = props.data.properties.options.map((option) => ({
    id: option.id,
    label: option.label,
    value: option.id,
  }))

  return (
    <Field
      static={props.static}
      name={props.data.id}
      label={props.data.properties.label}
      description={props.data.properties.description}
    >
      <BaseSelect.Root
        disabled={props.static}
        value={props.static ? undefined : (props.value ?? null)}
        onValueChange={props.static ? undefined : props.onValueChange}
      >
        <BaseSelect.Trigger
          className={cn(
            // Base
            'flex h-14 w-full items-center justify-between rounded-(--sf-radius) border px-4 text-base transition-all outline-none',
            'border-(--sf-color-primary)/50 bg-(--sf-color-background) text-(--sf-color-primary)',
            // Hover
            'hover:border-(--sf-color-primary)/70',
            // Focus
            'focus:border-(--sf-color-primary) focus:ring focus:ring-(--sf-color-primary)',
            props.static && 'pointer-events-none',
          )}
        >
          <BaseSelect.Value className="data-placeholder:text-(--sf-color-primary)/50">
            {(value) => {
              if (!value) return props.data.properties.placeholder
              const option = options.find((opt) => opt.id === value)
              return option?.label ?? value
            }}
          </BaseSelect.Value>
          <BaseSelect.Icon className="transition-transform">
            <ChevronDownIcon className="size-5 text-(--sf-color-primary)/50" />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner className="z-50 outline-none" sideOffset={4} alignItemWithTrigger={false}>
            <BaseSelect.Popup className="max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-(--sf-radius) border border-(--sf-color-primary)/30 bg-(--sf-color-background) p-1 text-(--sf-color-primary) shadow-lg transition-[transform,scale,opacity]">
              <BaseSelect.List className="max-h-60 overflow-y-auto">
                {options.map((option) => (
                  <BaseSelect.Item
                    key={option.id}
                    value={option.id}
                    className="grid cursor-default scroll-my-1 grid-cols-[1fr_0.75rem] items-center gap-2 rounded-[calc(var(--sf-radius)-4px)] py-3.5 pr-5 pl-3 leading-4 transition-colors outline-none select-none data-highlighted:bg-(--sf-color-primary)/10"
                  >
                    <BaseSelect.ItemText className="col-start-1">{option.label}</BaseSelect.ItemText>
                    <BaseSelect.ItemIndicator className="col-start-2">
                      <CheckIcon className="size-5 text-(--sf-color-primary)" />
                    </BaseSelect.ItemIndicator>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </Field>
  )
}
