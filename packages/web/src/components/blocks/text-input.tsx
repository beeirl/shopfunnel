import { cn } from '@/lib/utils'
import { Input as BaseInput } from '@base-ui/react/input'
import type { TextInputBlock as BlockType } from '@shopfunnel/core/funnel/types'

export interface TextInputBlockProps {
  block: BlockType
  static?: boolean
  value?: string
  onValueChange?: (value: string) => void
}

export function TextInputBlock(props: TextInputBlockProps) {
  return (
    <div className="group-not-data-first/block:mt-6">
      <BaseInput
        className={cn(
          // Base
          'h-14 w-full rounded-(--sf-radius) border-2 border-(--sf-border) bg-(--sf-background) px-4 text-base text-(--sf-foreground) transition-all outline-none placeholder:text-(--sf-foreground)/50',
          // Focus
          'focus-visible:border-(--sf-ring) focus-visible:ring-3 focus-visible:ring-(--sf-ring)/50',
          props.static && 'pointer-events-none',
        )}
        autoFocus
        disabled={props.static}
        placeholder={props.block.properties.placeholder}
        type="text"
        value={props.static ? undefined : (props.value ?? '')}
        onValueChange={props.static ? undefined : props.onValueChange}
      />
    </div>
  )
}
