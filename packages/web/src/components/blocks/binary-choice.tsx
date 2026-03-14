import { cn } from '@/lib/utils'
import type { BinaryChoiceBlock as BlockType } from '@shopfunnel/core/funnel/types'

export interface BinaryChoiceBlockProps {
  block: BlockType
  static?: boolean
  value?: string | null
  onValueChange?: (value: string | null) => void
}

export function BinaryChoiceBlock(props: BinaryChoiceBlockProps) {
  return (
    <div className="flex gap-3">
      {props.block.properties.options.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={props.static}
          className={cn(
            'flex h-12 flex-1 cursor-pointer items-center justify-center rounded-(--sf-radius) text-base font-semibold transition-all outline-none',
            'hover:opacity-90 active:scale-[0.98]',
            'focus-visible:ring-3 focus-visible:ring-(--sf-ring)/50',
            props.static && 'pointer-events-none',
          )}
          style={{
            backgroundColor: option.backgroundColor || 'var(--sf-primary)',
            color: option.foregroundColor || 'var(--sf-primary-foreground)',
          }}
          onClick={() => {
            if (props.static) return
            props.onValueChange?.(option.id)
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
