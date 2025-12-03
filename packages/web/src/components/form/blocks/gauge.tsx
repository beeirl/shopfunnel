import type { FormBlock } from '../types'

export interface GaugeBlockProps {
  block: Extract<FormBlock, { type: 'gauge' }>
}

export function GaugeBlock({ block }: GaugeBlockProps) {
  const min = block.properties.minValue ?? 0
  const max = block.properties.maxValue ?? 100

  // Parse the value - it will be interpolated by the form before rendering
  const rawValue = block.properties.value
  const numericValue = Number(rawValue) || 0
  const clampedValue = Math.max(min, Math.min(max, numericValue))

  const percentage = ((clampedValue - min) / (max - min)) * 100

  return (
    <div className="flex w-full flex-col items-center gap-2 py-4">
      <div className="relative w-full pt-12.5 pb-2">
        {/* Tooltip */}
        <div
          className="absolute z-20 -translate-x-1/2 transition-all duration-200"
          style={{ left: `${percentage}%`, top: 0 }}
        >
          <div className="relative">
            <div className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-lg">
              {block.properties.label || 'Value'}
            </div>
            {/* Tooltip arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-600" />
          </div>
        </div>

        {/* Gauge track */}
        <div className="relative h-3 w-full">
          <div className="absolute inset-0 overflow-hidden rounded-full bg-gray-100">
            {/* Gradient background */}
            <div
              className="absolute inset-0 h-full w-full"
              style={{
                background: 'linear-gradient(to right, #67e8f9, #86efac, #fde047, #fdba74, #f87171)',
              }}
            />
          </div>

          {/* Thumb */}
          <div
            className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
            style={{ left: `${percentage}%` }}
          >
            <div className="size-7 rounded-full border-4 border-gray-200 bg-white shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
