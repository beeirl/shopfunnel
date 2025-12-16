import type { GaugeBlock } from '@shopfunnel/core/form/schema'

export interface GaugeProps {
  block: GaugeBlock
}

export function Gauge(_props: GaugeProps) {
  return (
    <div className="flex h-12 items-center justify-center rounded-[var(--radius)] bg-muted text-sm text-muted-foreground">
      Gauge block
    </div>
  )
}
