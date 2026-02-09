import * as React from 'react'

import { cn } from '@/lib/utils'

const CircularProgressContext = React.createContext<{
  size: number
  strokeWidth: number
  radius: number
  circumference: number
  offset: number
} | null>(null)

function useCircularProgress() {
  const context = React.use(CircularProgressContext)
  if (!context) {
    throw new Error('CircularProgress components must be used within CircularProgress.Root')
  }
  return context
}

function CircularProgressRoot({
  value,
  size = 20,
  strokeWidth = 3,
  children,
  className,
  ...props
}: React.ComponentProps<'svg'> & {
  value: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <CircularProgressContext value={{ size, strokeWidth, radius, circumference, offset }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn('rotate-[-90deg]', className)}
        {...props}
      >
        {children}
      </svg>
    </CircularProgressContext>
  )
}

function CircularProgressTrack({ className, children, ...props }: React.ComponentProps<'circle'>) {
  const { size, strokeWidth, radius } = useCircularProgress()

  return (
    <>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className={cn('stroke-border', className)}
        {...props}
      />
      {children}
    </>
  )
}

function CircularProgressIndicator({ className, ...props }: React.ComponentProps<'circle'>) {
  const { size, strokeWidth, radius, circumference, offset } = useCircularProgress()

  return (
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={circumference}
      strokeDashoffset={offset}
      className={cn('stroke-primary transition-all duration-300', className)}
      {...props}
    />
  )
}

export const CircularProgress = {
  Root: CircularProgressRoot,
  Track: CircularProgressTrack,
  Indicator: CircularProgressIndicator,
}
