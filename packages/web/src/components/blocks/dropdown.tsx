import { cn } from '@/lib/utils'
import { Select as BaseSelect } from '@base-ui/react/select'
import type { DropdownBlock as BlockType } from '@shopfunnel/core/funnel/types'
import { IconCheck as CheckIcon, IconChevronDown as ChevronDownIcon } from '@tabler/icons-react'

export interface DropdownBlockProps {
  block: BlockType
  static?: boolean
  value?: string
  onValueChange?: (value: string) => void
}

export function DropdownBlock(props: DropdownBlockProps) {
  const options = props.block.properties.options.map((option) => ({
    id: option.id,
    label: option.label,
    value: option.id,
  }))

  return (
    <div className="group-not-data-first/block:mt-6">
      <BaseSelect.Root
        disabled={props.static}
        value={props.static ? undefined : (props.value ?? null)}
        onValueChange={props.static ? undefined : props.onValueChange}
      >
        <BaseSelect.Trigger
          className={cn(
            // Base
            'flex h-14 w-full items-center justify-between rounded-(--sf-radius) border-2 border-(--sf-border) px-4 text-base text-(--sf-foreground) transition-all outline-none',
            // Focus
            'focus-visible:border-(--sf-ring) focus-visible:ring-3 focus-visible:ring-(--sf-ring)/50',
            props.static && 'pointer-events-none',
          )}
        >
          <BaseSelect.Value className="data-placeholder:text-(--sf-foreground)/50">
            {(value) => {
              if (!value) return props.block.properties.placeholder
              const option = options.find((opt) => opt.id === value)
              return option?.label ?? value
            }}
          </BaseSelect.Value>
          <BaseSelect.Icon render={<ChevronDownIcon className="pointer-events-none size-5 opacity-30" />} />
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner className="z-50 outline-none" sideOffset={8} alignItemWithTrigger={false}>
            <BaseSelect.Popup className="max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-(--sf-radius) bg-(--sf-background) p-1 shadow-md ring-2 ring-(--sf-border) transition-[transform,scale,opacity] slide-in-from-top-2 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
              <BaseSelect.List>
                {options.map((option) => (
                  <BaseSelect.Item
                    key={option.id}
                    value={option.id}
                    className="grid cursor-default scroll-my-1 grid-cols-[1fr_0.75rem] items-center gap-2 rounded-[calc(var(--sf-radius)-3px)] py-3.5 pr-5 pl-3 leading-4 text-(--sf-foreground) transition-colors outline-none select-none data-highlighted:bg-(--sf-muted)"
                  >
                    <BaseSelect.ItemText className="col-start-1">{option.label}</BaseSelect.ItemText>
                    <BaseSelect.ItemIndicator className="col-start-2">
                      <CheckIcon className="size-5" />
                    </BaseSelect.ItemIndicator>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </div>
  )
}
