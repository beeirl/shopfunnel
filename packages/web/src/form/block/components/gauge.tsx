import type { GaugeBlock } from '@shopfunnel/core/form/schema'

export interface GaugeProps {
  schema: GaugeBlock
}

export function Gauge(props: GaugeProps) {
  return (
    <div className="flex h-12 items-center justify-center rounded-(--radius) bg-muted text-sm text-muted-foreground">
      Gauge block
    </div>
  )
}
