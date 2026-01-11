import type { LoaderBlock as BlockType } from '@shopfunnel/core/funnel/types'
import * as React from 'react'

export interface LoaderBlockProps {
  block: BlockType
  static?: boolean
  onLoadingValueChange?: (value: boolean) => void
}

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
  const t = Math.max(0, Math.min(1, normalizedTime))

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const current = KEYFRAMES[i]!
    const next = KEYFRAMES[i + 1]!

    if (t >= current.time && t <= next.time) {
      const segmentProgress = (t - current.time) / (next.time - current.time)
      return current.progress + (next.progress - current.progress) * segmentProgress
    }
  }

  return 100
}

export function LoaderBlock(props: LoaderBlockProps) {
  const { description, duration } = props.block.properties

  const isStatic = props.static || duration === 0
  const [progress, setProgress] = React.useState(isStatic ? 75 : 0)
  const hasCompletedRef = React.useRef(false)
  const onLoadingChangeRef = React.useRef(props.onLoadingValueChange)

  React.useEffect(() => {
    onLoadingChangeRef.current = props.onLoadingValueChange
  }, [props.onLoadingValueChange])

  React.useEffect(() => {
    // Static mode - no animation, no auto-advance
    if (isStatic) {
      setProgress(75)
      return
    }

    const durationMs = duration
    let startTime: number | null = null
    let animationId: number

    hasCompletedRef.current = false

    // Signal loading started
    onLoadingChangeRef.current?.(true)

    function animate(currentTime: number) {
      if (startTime === null) {
        startTime = currentTime
      }

      const elapsed = currentTime - startTime
      const normalizedTime = Math.min(elapsed / durationMs, 1)
      const currentProgress = interpolateProgress(normalizedTime)

      setProgress(Math.round(currentProgress))

      if (normalizedTime < 1) {
        animationId = requestAnimationFrame(animate)
      } else if (!hasCompletedRef.current) {
        hasCompletedRef.current = true
        // Signal loading complete
        onLoadingChangeRef.current?.(false)
      }
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [duration, isStatic])

  return (
    <div className="flex w-full flex-col items-center py-6 group-not-data-first/block:mt-6">
      <div className="mb-6 text-5xl font-bold text-(--fun-foreground)">{progress}%</div>
      <div className="h-2.5 w-full overflow-hidden rounded-[calc(var(--fun-radius)-5px)] bg-(--fun-muted)">
        <div
          className="h-full rounded-[calc(var(--fun-radius)-5px)] bg-(--fun-primary) transition-[width] duration-75 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {description && <p className="mt-4 text-center text-sm text-(--fun-muted-foreground)">{description}</p>}
    </div>
  )
}
