import * as React from 'react'
import type { FormBlock } from '../types'

export function SliderBlock({ block, value: valueProp, onValueChange }: SliderBlock.Props) {
  const min = block.properties.minValue ?? 0
  const max = block.properties.maxValue ?? 100
  const stepValue = block.properties.step ?? 1
  const defaultVal = block.properties.defaultValue ?? min

  const [value, setValue] = React.useState<number>(valueProp ?? defaultVal)

  React.useEffect(() => {
    if (valueProp !== undefined) {
      setValue(valueProp)
    }
  }, [valueProp])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    setValue(newValue)
    onValueChange(newValue)
  }

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="w-full">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">{min}</span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-lg font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            {value}
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">{max}</span>
        </div>

        <div className="relative h-2">
          <div className="absolute inset-0 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          <div className="absolute inset-y-0 left-0 rounded-full bg-blue-500" style={{ width: `${percentage}%` }} />
          <input
            type="range"
            min={min}
            max={max}
            step={stepValue}
            value={value}
            onChange={handleChange}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
          />
        </div>

        {stepValue > 1 && (
          <div className="flex justify-between px-1">
            {Array.from({ length: Math.floor((max - min) / stepValue) + 1 }, (_, i) => (
              <span key={i} className="h-1.5 w-0.5 bg-neutral-300 dark:bg-neutral-600" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export namespace SliderBlock {
  export interface Props {
    block: Extract<FormBlock, { type: 'slider' }>
    value?: number
    onValueChange: (value: number) => void
  }
}
