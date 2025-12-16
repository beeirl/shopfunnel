import type { ProgressBlock } from '@shopfunnel/core/form/schema'

export interface ProgressProps {
  block: ProgressBlock
}

export function Progress(_props: ProgressProps) {
  return (
    <div className="flex h-12 items-center justify-center rounded-[var(--radius)] bg-muted text-sm text-muted-foreground">
      Progress block
    </div>
  )
}
