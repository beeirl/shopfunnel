import type { ProgressBlock } from '@shopfunnel/core/form/schema'

export interface ProgressProps {
  schema: ProgressBlock
}

export function Progress(props: ProgressProps) {
  return (
    <div className="flex h-12 items-center justify-center rounded-(--radius) bg-muted text-sm text-muted-foreground">
      Progress block
    </div>
  )
}
