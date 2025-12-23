import { Field } from '@/form/components/field'
import { cn } from '@/lib/utils'
import type { PictureChoiceBlock as PictureChoiceBlockData } from '@shopfunnel/core/form/types'
import { IconPhoto as PhotoIcon } from '@tabler/icons-react'
import { ListBox as ReactAriaListbox, ListBoxItem as ReactAriaListboxItem } from 'react-aria-components'

export interface PictureChoiceBlockProps {
  data: PictureChoiceBlockData
  index: number
  static?: boolean
  value?: string | string[] | null
  onValueChange?: (value: string | string[] | null) => void
}

export function PictureChoiceBlock(props: PictureChoiceBlockProps) {
  return (
    <Field
      className={cn(props.index > 0 && 'mt-6')}
      static={props.static}
      name={props.data.id}
      label={props.data.properties.label}
      description={props.data.properties.description}
    >
      <ReactAriaListbox
        className="grid grid-cols-2 gap-3"
        disallowEmptySelection={props.static ? false : !props.data.properties.multiple}
        selectionMode={props.static ? 'none' : props.data.properties.multiple ? 'multiple' : 'single'}
        selectedKeys={
          props.static ? undefined : Array.isArray(props.value) ? props.value : props.value ? [props.value] : []
        }
        onSelectionChange={(selection) => {
          if (props.static || selection === 'all') return
          const value = Array.from(selection) as string[]
          props.onValueChange?.(props.data.properties.multiple ? value : (value[0] ?? null))
        }}
      >
        {props.data.properties.choices.map((choice) => (
          <ReactAriaListboxItem
            key={choice.id}
            id={choice.id}
            isDisabled={props.static}
            onClick={() => {
              if (!props.data.properties.multiple && props.value === choice.id) {
                props.onValueChange?.(choice.id)
              }
            }}
            onPointerDown={(e) => {
              if (!props.data.properties.multiple && props.value === choice.id) {
                e.preventDefault()
              }
            }}
            className={cn(
              // Base
              'relative flex cursor-pointer flex-col overflow-hidden rounded-(--sf-radius) bg-(--sf-color-background) transition-all outline-none',
              'border border-(--sf-color-primary)/30',
              // Hover
              'hover:scale-[1.02] hover:border-(--sf-color-primary)/50',
              // Focus
              'data-focused:ring-2 data-focused:ring-(--sf-color-primary) data-focused:ring-offset-2',
              // Selected
              'data-selected:border-2 data-selected:border-(--sf-color-primary) data-selected:hover:border-(--sf-color-primary)',
              props.static && 'pointer-events-none',
            )}
          >
            <div className="relative aspect-4/3 w-full overflow-hidden bg-(--sf-color-primary)/10">
              {choice.media?.value ? (
                <img src={choice.media.value} alt={choice.label} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <PhotoIcon className="size-12 text-(--sf-color-primary) opacity-30" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5 bg-(--sf-color-primary) px-3 py-2.5">
              <span className="text-center text-sm font-semibold text-(--sf-color-primary-foreground)">
                {choice.label}
              </span>
              {choice.description && (
                <span className="text-center text-xs text-(--sf-color-primary-foreground)/80">
                  {choice.description}
                </span>
              )}
            </div>
          </ReactAriaListboxItem>
        ))}
      </ReactAriaListbox>
    </Field>
  )
}
