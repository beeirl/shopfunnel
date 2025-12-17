import { cn } from '@/lib/utils'
import { Radio as BaseRadio } from '@base-ui/react/radio'
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group'

function SegmentedControlRoot({ className, ...props }: BaseRadioGroup.Props) {
  return (
    <BaseRadioGroup
      data-slot="segmented-control"
      className={cn(
        'flex h-8 w-full gap-[3px] rounded-[10px] bg-muted p-[3px] ring-1 ring-input ring-inset',
        className,
      )}
      {...props}
    />
  )
}

function SegmentedControlSegment({ className, ...props }: BaseRadio.Root.Props) {
  return (
    <BaseRadio.Root
      data-slot="segmented-control-segment"
      className={cn(
        'relative flex h-[26px] w-full cursor-pointer items-center justify-center rounded-[7px] border border-transparent text-xm text-muted-foreground ring ring-transparent transition-colors duration-75 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50! disabled:opacity-50 data-checked:bg-background data-checked:text-foreground data-checked:shadow-xs data-checked:ring-border',
        className,
      )}
      {...props}
    />
  )
}

export const SegmentedControl = {
  Root: SegmentedControlRoot,
  Segment: SegmentedControlSegment,
}
