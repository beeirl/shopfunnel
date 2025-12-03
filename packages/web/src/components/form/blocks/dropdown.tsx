import { Select } from '@base-ui-components/react/select'
import type { FormBlock } from '../types'
import { Field } from './field'

export interface DropdownBlockProps {
  block: Extract<FormBlock, { type: 'dropdown' }>
  value?: string
  onValueChange: (value: string) => void
}

export function DropdownBlock({ block, value, onValueChange }: DropdownBlockProps) {
  return (
    <Field.Root name={block.id}>
      <Field.Label>{block.properties.label}</Field.Label>
      {block.properties.description && <Field.Description>{block.properties.description}</Field.Description>}
      <Select.Root
        items={block.properties.options.map((option) => ({ label: option.label, value: option.id }))}
        value={value}
        onValueChange={onValueChange}
      >
        <Select.Trigger className="flex w-full items-center justify-between rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-left text-lg transition-colors focus:border-blue-500 focus:outline-none data-popup-open:border-blue-500">
          <Select.Value className="data-placeholder:text-gray-400" />
          <Select.Icon className="flex text-neutral-500 transition-transform data-popup-open:rotate-180">
            <ChevronDownIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className="z-50 outline-none" sideOffset={4} alignItemWithTrigger={false}>
            <Select.Popup className="group max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-lg border border-gray-200 bg-[canvas] bg-clip-padding py-1 text-gray-900 shadow-lg shadow-gray-200 transition-[transform,scale,opacity] data-ending-style:scale-90 data-ending-style:opacity-0 data-side=none:min-w-[calc(var(--anchor-width)+1rem)] data-side=none:data-ending-style:transition-none data-starting-style:scale-90 data-starting-style:opacity-0 data-side=none:data-starting-style:scale-100 data-side=none:data-starting-style:opacity-100 data-side=none:data-starting-style:transition-none">
              <Select.List className="max-h-60 overflow-y-auto">
                {block.properties.options.map((option) => (
                  <Select.Item
                    key={option.id}
                    value={option.id}
                    className="grid cursor-default scroll-my-1 grid-cols-[1fr_0.75rem] items-center gap-2 py-3.5 pr-5.5 pl-4.5 leading-4 outline-none select-none group-data-[side=none]:pr-12 group-data-[side=none]:text-base group-data-[side=none]:leading-4 pointer-coarse:py-2.5 pointer-coarse:text-[0.925rem] [@media(hover:hover)]:[&[data-highlighted]]:relative [@media(hover:hover)]:[&[data-highlighted]]:z-0 [@media(hover:hover)]:[&[data-highlighted]]:before:absolute [@media(hover:hover)]:[&[data-highlighted]]:before:inset-x-1 [@media(hover:hover)]:[&[data-highlighted]]:before:inset-y-0 [@media(hover:hover)]:[&[data-highlighted]]:before:z-[-1] [@media(hover:hover)]:[&[data-highlighted]]:before:rounded-md [@media(hover:hover)]:[&[data-highlighted]]:before:bg-gray-100 [@media(hover:hover)]:[&[data-highlighted]]:before:content-['']"
                  >
                    <Select.ItemText className="col-start-1">{option.label}</Select.ItemText>
                    <Select.ItemIndicator className="col-start-2">
                      <CheckIcon />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </Field.Root>
  )
}

export namespace DropdownBlock {
  export interface Props {
    block: Extract<FormBlock, { type: 'dropdown' }>
    value?: string
    onValueChange: (value: string) => void
  }
}

function ChevronDownIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 10 10">
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  )
}
