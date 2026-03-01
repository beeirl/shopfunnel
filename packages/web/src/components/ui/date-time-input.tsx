import { cn } from '@/lib/utils'
import { CalendarDateTime, type DateValue } from '@internationalized/date'
import * as React from 'react'
import { DateField, DateInput, DateSegment } from 'react-aria-components'

type DateTimeInputProps = {
  value: Date
  onChange: (value: Date) => void
  className?: string
}

function DateTimeInput({ value, onChange, className }: DateTimeInputProps) {
  const calendarValue = React.useMemo(
    () =>
      new CalendarDateTime(
        value.getFullYear(),
        value.getMonth() + 1,
        value.getDate(),
        value.getHours(),
        value.getMinutes(),
      ),
    [value],
  )

  const handleChange = React.useCallback(
    (newValue: DateValue | null) => {
      if (newValue) {
        const dt = newValue as CalendarDateTime
        onChange(new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute))
      }
    },
    [onChange],
  )

  return (
    <DateField value={calendarValue} onChange={handleChange} granularity="minute" aria-label="Date and time">
      <DateInput
        data-slot="date-time-input"
        className={cn(
          'flex h-8 w-full min-w-0 items-center rounded-lg border border-input bg-background px-2.5 py-1 text-sm transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xm dark:bg-input/30',
          className,
        )}
      >
        {(segment) => (
          <DateSegment
            segment={segment}
            className="inline rounded-sm caret-transparent outline-none not-data-[type=literal]:px-0.5 data-[focused]:bg-muted data-[placeholder]:text-muted-foreground data-[type=literal]:px-0 data-[type=literal]:text-muted-foreground"
          />
        )}
      </DateInput>
    </DateField>
  )
}

export { DateTimeInput }
