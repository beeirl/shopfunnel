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
          'h-14 w-full rounded-(--fun-radius) border-2 border-(--fun-border) bg-(--fun-background) px-4 text-base text-(--fun-foreground) transition-all outline-none placeholder:text-(--fun-foreground)/50',
          // Focus
          'focus-visible:border-(--fun-ring) focus-visible:ring-3 focus-visible:ring-(--fun-ring)/50',
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
