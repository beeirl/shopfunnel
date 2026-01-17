import { cn } from '@/lib/utils'
import type { LoaderBlock as BlockType } from '@shopfunnel/core/funnel/types'
import { IconCircleCheckFilled as CircleCheckFilledIcon, IconLoader2 as LoaderIcon } from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

export interface LoaderBlockProps {
  block: BlockType
  static?: boolean
  onLoadingValueChange?: (value: boolean) => void
}

const DEFAULT_DURATION = 3000

interface StepsProps {
  items: string[]
  progress: number
  isStatic: boolean
  duration: number
}

function ChecklistSteps({ items, progress, isStatic }: StepsProps) {
  const completedCount = isStatic ? Math.floor(items.length / 2) : Math.floor((progress / 100) * items.length)
  const activeIndex = completedCount

  return (
    <div className="flex w-full justify-center">
      <div className="flex max-w-full flex-col gap-2">
        {items.map((item, index) => {
          const completed = index < completedCount
          const active = index === activeIndex && !isStatic
          return (
            <div
              key={index}
              className={cn(
                'flex items-start gap-2 text-base transition-opacity duration-300',
                completed || active ? 'text-(--sf-foreground)' : 'text-(--sf-muted-foreground)',
              )}
            >
              {completed ? (
                <CircleCheckFilledIcon className="mt-0.5 size-5 shrink-0 animate-in text-(--sf-primary) duration-300 zoom-in-50" />
              ) : active ? (
                <LoaderIcon className="mt-0.5 size-5 shrink-0 animate-spin text-(--sf-primary)" />
              ) : (
                <div className="mt-0.5 size-5 shrink-0" />
              )}
              <span className="min-w-0 break-words">{item}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FadeSteps({ items, progress, isStatic }: StepsProps) {
  const activeIndex = isStatic ? 0 : Math.min(Math.floor((progress / 100) * items.length), items.length - 1)

  return (
    <div className="relative w-full text-center text-base text-(--sf-muted-foreground)">
      {/* Invisible spacer to establish container height */}
      <span className="invisible">{items[activeIndex]}</span>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={activeIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 text-center"
        >
          {items[activeIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

function SlideSteps({ items, progress, isStatic }: StepsProps) {
  const activeIndex = isStatic ? 0 : Math.min(Math.floor((progress / 100) * items.length), items.length - 1)

  return (
    <div className="relative w-full overflow-hidden text-center text-base text-(--sf-muted-foreground)">
      {/* Invisible spacer to establish container height */}
      <span className="invisible">{items[activeIndex]}</span>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={activeIndex}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-0 truncate text-center"
        >
          {items[activeIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const STEP_VARIANTS = {
  checklist: ChecklistSteps,
  fade: FadeSteps,
  slide: SlideSteps,
} as const

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
  const { description, duration: durationProp, showProgress = true, steps } = props.block.properties
  const duration = durationProp ?? DEFAULT_DURATION

  const isStatic = props.static || duration === 0
  const [progress, setProgress] = useState(isStatic ? 75 : 0)
  const hasCompletedRef = useRef(false)
  const onLoadingChangeRef = useRef(props.onLoadingValueChange)

  useEffect(() => {
    onLoadingChangeRef.current = props.onLoadingValueChange
  }, [props.onLoadingValueChange])

  useEffect(() => {
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

  const StepsComponent = steps?.items.length ? STEP_VARIANTS[steps.variant] : null

  return (
    <div className="relative flex w-full flex-col items-center gap-6 overflow-hidden py-6 group-not-data-first/block:mt-6">
      {showProgress && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="text-5xl font-bold text-(--sf-foreground)">{progress}%</div>
          <div className="h-2.5 w-full overflow-hidden rounded-[calc(var(--sf-radius)-5px)] bg-(--sf-muted)">
            <div
              className="h-full rounded-[calc(var(--sf-radius)-5px)] bg-(--sf-primary) transition-[width] duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {description && !StepsComponent && (
            <p className="text-center text-base text-(--sf-muted-foreground)">{description}</p>
          )}
        </div>
      )}
      {StepsComponent && steps && (
        <StepsComponent items={steps.items} progress={progress} isStatic={isStatic} duration={duration} />
      )}
    </div>
  )
}
