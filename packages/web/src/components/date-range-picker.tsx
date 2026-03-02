import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { DateTimeInput } from '@/components/ui/date-time-input'
import { Popover } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { IconCheck as CheckIcon, IconSelector as SelectorIcon } from '@tabler/icons-react'
import { endOfDay, format, startOfDay, startOfMonth, startOfYear, subDays } from 'date-fns'
import * as React from 'react'
import { type DateRange } from 'react-day-picker'

type DateRangePreset = {
  label: string
  value: string
  range: () => { from: Date; to: Date }
}

export type DateRangePickerValue = {
  preset: string | null
  from: Date
  to: Date
}

type DateRangePickerProps = {
  value: DateRangePickerValue
  onValueChange: (value: DateRangePickerValue) => void
  align?: 'start' | 'center' | 'end'
  size?: 'sm' | 'default'
}

function getPresets(): DateRangePreset[] {
  const now = new Date()
  now.setSeconds(0, 0)

  return [
    { label: 'Today', value: 'today', range: () => ({ from: startOfDay(now), to: now }) },
    {
      label: 'Yesterday',
      value: 'yesterday',
      range: () => {
        const yesterday = subDays(now, 1)
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
      },
    },
    { label: 'Last 7 days', value: '7d', range: () => ({ from: new Date(now.getTime() - 7 * 86400000), to: now }) },
    { label: 'Last 30 days', value: '30d', range: () => ({ from: new Date(now.getTime() - 30 * 86400000), to: now }) },
    { label: 'Month', value: 'month', range: () => ({ from: startOfMonth(now), to: now }) },
    { label: 'Year', value: 'year', range: () => ({ from: startOfYear(now), to: now }) },
  ]
}

function formatDateRangeLabel(from: Date, to: Date, separator = '→'): string {
  const sameDay =
    from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth() && from.getDate() === to.getDate()
  if (sameDay) {
    return format(from, 'MMM d, yyyy')
  }
  const sameYear = from.getFullYear() === to.getFullYear()
  if (sameYear) {
    return `${format(from, 'MMM d')} ${separator} ${format(to, 'MMM d, yyyy')}`
  }
  return `${format(from, 'MMM d, yyyy')} ${separator} ${format(to, 'MMM d, yyyy')}`
}

function formatTriggerLabel(value: DateRangePickerValue, presets: DateRangePreset[]): string {
  if (value.preset) {
    const match = presets.find((p) => p.value === value.preset)
    if (match) return match.label
  }
  if (value.from && value.to) {
    return formatDateRangeLabel(value.from, value.to, '–')
  }
  return 'Select date range'
}

export function DateRangePicker({ value, onValueChange, align = 'end', size = 'default' }: DateRangePickerProps) {
  const presets = React.useMemo(() => getPresets(), [])
  const [open, setOpen] = React.useState(false)

  const [pendingPreset, setPendingPreset] = React.useState<string | null>(value.preset)
  const [pendingRange, setPendingRange] = React.useState<DateRange>({
    from: value.from,
    to: value.to,
  })

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setPendingPreset(value.preset)
        setPendingRange({ from: value.from, to: value.to })
      }
      setOpen(nextOpen)
    },
    [value],
  )

  const handlePresetClick = React.useCallback((preset: DateRangePreset) => {
    const range = preset.range()
    setPendingPreset(preset.value)
    setPendingRange({ from: range.from, to: range.to })
  }, [])

  const handleCalendarSelect = React.useCallback((range: DateRange | undefined) => {
    if (!range) return

    const from = range.from
    const to = range.to

    if (from) {
      setPendingRange((prev) => {
        const newFrom = new Date(from)
        const fromDayChanged =
          !prev.from ||
          prev.from.getFullYear() !== newFrom.getFullYear() ||
          prev.from.getMonth() !== newFrom.getMonth() ||
          prev.from.getDate() !== newFrom.getDate()

        if (fromDayChanged) {
          newFrom.setHours(0, 0, 0, 0)
        } else if (prev.from) {
          newFrom.setHours(prev.from.getHours(), prev.from.getMinutes(), 0, 0)
        }

        const newTo = to ? new Date(to) : undefined
        if (newTo) {
          const toDayChanged =
            !prev.to ||
            prev.to.getFullYear() !== newTo.getFullYear() ||
            prev.to.getMonth() !== newTo.getMonth() ||
            prev.to.getDate() !== newTo.getDate()

          if (toDayChanged) {
            newTo.setHours(23, 59, 59, 999)
          } else if (prev.to) {
            newTo.setHours(prev.to.getHours(), prev.to.getMinutes(), 59, 999)
          }
        }

        return { from: newFrom, to: newTo }
      })
      setPendingPreset(null)
    }
  }, [])

  const handleStartChange = React.useCallback((date: Date) => {
    setPendingRange((prev) => ({ ...prev, from: date }))
    setPendingPreset(null)
  }, [])

  const handleEndChange = React.useCallback((date: Date) => {
    setPendingRange((prev) => ({ ...prev, to: date }))
    setPendingPreset(null)
  }, [])

  const handleApply = React.useCallback(() => {
    if (pendingRange.from && pendingRange.to) {
      onValueChange({
        preset: pendingPreset,
        from: pendingRange.from,
        to: pendingRange.to,
      })
      setOpen(false)
    }
  }, [pendingRange, pendingPreset, onValueChange])

  const pendingPresetLabel = React.useMemo(() => {
    if (!pendingPreset) return null
    return presets.find((p) => p.value === pendingPreset)?.label ?? null
  }, [pendingPreset, presets])

  const triggerLabel = formatTriggerLabel(value, presets)

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        render={
          <button
            data-size={size}
            className="flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:bg-input/30 dark:hover:bg-input/50"
          >
            {triggerLabel}
            <SelectorIcon className="pointer-events-none size-4 text-muted-foreground" />
          </button>
        }
      />
      <Popover.Content align={align} className="w-auto gap-0 p-0">
        <div className="flex">
          <div className="flex w-48 flex-col overflow-y-auto border-r border-border p-1">
            {presets.map((preset) => {
              const isActive = pendingPreset === preset.value
              return (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    'flex items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                  )}
                >
                  <span>{preset.label}</span>
                  {isActive && <CheckIcon className="size-4 text-foreground" />}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col">
            <div className="flex gap-4 border-b border-border px-4 pt-3 pb-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Start</label>
                {pendingRange.from && <DateTimeInput value={pendingRange.from} onChange={handleStartChange} />}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">End</label>
                {pendingRange.to && <DateTimeInput value={pendingRange.to} onChange={handleEndChange} />}
              </div>
            </div>

            <div className="px-2">
              <Calendar.Root
                mode="range"
                numberOfMonths={2}
                selected={pendingRange}
                onSelect={handleCalendarSelect}
                defaultMonth={pendingRange.from}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {pendingPresetLabel ??
                  (pendingRange.from && pendingRange.to
                    ? formatDateRangeLabel(pendingRange.from, pendingRange.to)
                    : 'Select date range')}
              </span>
              <Button size="default" disabled={!pendingRange.from || !pendingRange.to} onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  )
}
