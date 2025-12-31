import { cn } from '@/lib/utils'
import { Input as BaseInput } from '@base-ui/react/input'
import type { TextInputBlock as BlockType } from '@shopfunnel/core/quiz/types'

export interface TextInputBlockProps {
  block: BlockType
  index: number
  static?: boolean
  value?: string
  onValueChange?: (value: string) => void
}

export function TextInputBlock(props: TextInputBlockProps) {
  return (
    <div className={cn(props.index > 0 && 'mt-6')}>
      <BaseInput
        className={cn(
          // Base
          'h-14 w-full rounded-(--radius) border-2 border-border px-4 text-base text-foreground transition-all outline-none placeholder:text-foreground/50',
          // Focus
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
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
