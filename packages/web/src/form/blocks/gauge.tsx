import { cn } from '@/lib/utils'
import type { GaugeBlock as GaugeBlockData } from '@shopfunnel/core/form/types'

export interface GaugeBlockProps {
  data: GaugeBlockData
  index: number
  static?: boolean
}

export function GaugeBlock(props: GaugeBlockProps) {
  const { value: rawValue, tooltipLabel, marks, minValue = 0, maxValue = 10 } = props.data.properties

  const value = typeof rawValue === 'number' && !Number.isNaN(rawValue) ? rawValue : 0
  const range = maxValue - minValue
  const percentage = range > 0 ? Math.max(0, Math.min(100, ((value - minValue) / range) * 100)) : 0

  return (
    <div className={cn('w-full pt-14', props.index > 0 && 'mt-6')}>
      <div className="relative">
        <div
          className="h-2.5 w-full rounded-full"
          style={{
            background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6)',
          }}
        />

        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${percentage}%` }}>
          <div className="absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 flex-col items-center">
            <div className="rounded-lg bg-(--sf-color-primary) px-3 py-1.5 text-sm font-medium whitespace-nowrap text-(--sf-color-primary-foreground)">
              {tooltipLabel ? `${tooltipLabel} - ${value.toFixed(1)}` : value.toFixed(1)}
            </div>
            <div className="h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-(--sf-color-primary)" />
          </div>
          <div className="size-6 rounded-full border-2 border-(--sf-color-primary)/50 bg-(--sf-color-background)" />
        </div>
      </div>

      <div className="mt-3 flex h-4 items-center justify-between">
        {marks?.map((mark, index) => (
          <span key={index} className="text-xs font-medium tracking-wide text-foreground/50 uppercase">
            {mark}
          </span>
        ))}
      </div>
    </div>
  )
}
