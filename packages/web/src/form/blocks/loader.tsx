import { cn } from '@/lib/utils'
import type { LoaderBlock as LoaderBlockData } from '@shopfunnel/core/form/types'
import * as React from 'react'

export interface LoaderBlockProps {
  data: LoaderBlockData
  index: number
  static?: boolean
}

// Custom easing keyframes that simulate "calculating" feel
// Progress jumps quickly then pauses briefly, creating a thinking effect
const KEYFRAMES = [
  { progress: 0, time: 0 },
  { progress: 15, time: 0.08 },
  { progress: 23, time: 0.15 },
  { progress: 38, time: 0.28 },
  { progress: 45, time: 0.38 },
  { progress: 52, time: 0.48 },
  { progress: 68, time: 0.62 },
  { progress: 79, time: 0.75 },
  { progress: 88, time: 0.86 },
  { progress: 95, time: 0.93 },
  { progress: 100, time: 1.0 },
]

function interpolateProgress(normalizedTime: number): number {
  // Clamp time to [0, 1]
  const t = Math.max(0, Math.min(1, normalizedTime))

  // Find the two keyframes we're between
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const current = KEYFRAMES[i]!
    const next = KEYFRAMES[i + 1]!

    if (t >= current.time && t <= next.time) {
      // Linear interpolation between keyframes
      const segmentProgress = (t - current.time) / (next.time - current.time)
      return current.progress + (next.progress - current.progress) * segmentProgress
    }
  }

  return 100
}

export function LoaderBlock(props: LoaderBlockProps) {
  const { description, duration } = props.data.properties

  const [progress, setProgress] = React.useState(props.static ? 68 : 0)

  React.useEffect(() => {
    const durationMs = duration * 1000
    const startTime = performance.now()
    let animationId: number

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const normalizedTime = Math.min(elapsed / durationMs, 1)
      const currentProgress = interpolateProgress(normalizedTime)

      setProgress(Math.round(currentProgress))

      if (normalizedTime < 1) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [props.static, duration])

  return (
    <div className={cn('flex w-full flex-col items-center py-6', props.index > 0 && 'mt-6')}>
      <div className="mb-6 text-5xl font-bold text-(--sf-color-foreground)">{progress}%</div>
      <div className="h-2.5 w-full overflow-hidden rounded-[calc(var(--sf-radius)-5px)] bg-(--sf-color-primary)/20">
        <div
          className="h-full rounded-[calc(var(--sf-radius)-5px)] bg-(--sf-color-primary) transition-[width] duration-75 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {description && <p className="mt-4 text-center text-sm text-(--sf-color-foreground)/60">{description}</p>}
    </div>
  )
}
