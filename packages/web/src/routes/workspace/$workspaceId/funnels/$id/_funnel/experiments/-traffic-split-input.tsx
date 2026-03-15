import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import {
  IconPencil as PencilIcon,
  IconPlus as PlusIcon,
  IconStarFilled as StarFilledIcon,
  IconX as XIcon,
} from '@tabler/icons-react'

type Variant = { id: string; title: string; isMain: boolean }
type Weight = { funnelVariantId: string; weight: number }

interface TrafficSplitInputProps {
  variants: Variant[]
  weights: Weight[]
  onWeightsChange: (weights: Weight[]) => void
}

export function TrafficSplitInput({ variants, weights, onWeightsChange }: TrafficSplitInputProps) {
  const selectedVariants = variants.filter((v) => weights.some((w) => w.funnelVariantId === v.id))
  const availableVariants = variants.filter((v) => !weights.some((w) => w.funnelVariantId === v.id))

  const addVariant = (variantId: string) => {
    onWeightsChange([...weights, { funnelVariantId: variantId, weight: 0 }])
  }

  const removeVariant = (variantId: string) => {
    onWeightsChange(weights.filter((w) => w.funnelVariantId !== variantId))
  }

  const updateWeight = (variantId: string, value: string) => {
    onWeightsChange(weights.map((w) => (w.funnelVariantId === variantId ? { ...w, weight: Number(value) || 0 } : w)))
  }

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)

  return (
    <div>
      <Label className="mb-2">Traffic split</Label>
      <div className="relative z-10 divide-y divide-border overflow-hidden rounded-lg shadow-sm ring-1 ring-border">
        {selectedVariants.map((variant) => (
          <div
            key={variant.id}
            className="flex max-h-9 min-h-9 items-center justify-between gap-4 overflow-hidden pr-0 pl-1"
          >
            <span className="flex min-w-0 flex-1 items-center gap-1">
              {variant.isMain ? (
                <div className="w-7" />
              ) : (
                <Button variant="ghost" size="icon-sm" onClick={() => removeVariant(variant.id)}>
                  <XIcon />
                </Button>
              )}
              <p className="truncate text-sm font-medium text-foreground">{variant.title}</p>
              {variant.isMain && <StarFilledIcon className="size-3.5 shrink-0 text-amber-500" />}
            </span>
            <div
              className="flex max-h-9 min-h-9 shrink-0 cursor-text items-center gap-2 border-l border-border pr-4 transition-colors focus-within:bg-muted/50 hover:bg-muted/50"
              onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
            >
              <div className="relative flex items-center">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="h-8 w-14 [appearance:textfield] border-0 bg-transparent pr-4 pl-2 text-end shadow-none! focus-visible:ring-0 focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={String(weights.find((w) => w.funnelVariantId === variant.id)?.weight ?? 0)}
                  onValueChange={(value) => updateWeight(variant.id, value)}
                />
                <span className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <PencilIcon className="size-4 shrink-0 text-muted-foreground/50" />
            </div>
          </div>
        ))}
        {availableVariants.length > 0 && (
          <div>
            <Select.Root
              key={weights.length}
              defaultValue={undefined}
              onValueChange={(value: string) => {
                if (value) addVariant(value)
              }}
            >
              <SelectPrimitive.Trigger className="flex min-h-9 w-full items-center gap-2 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
                <PlusIcon className="size-4" />
                Add variant
              </SelectPrimitive.Trigger>
              <Select.Content alignItemWithTrigger={false}>
                <Select.Group>
                  {availableVariants.map((variant) => (
                    <Select.Item key={variant.id} value={variant.id}>
                      {variant.title}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
        )}
      </div>
      {weights.length > 0 && (
        <div
          className={`mx-4 flex h-8 items-center justify-center rounded-b-lg border-r border-b border-l border-border px-4 py-3 ${
            totalWeight === 100 ? 'bg-muted' : 'bg-red-50 dark:bg-red-900/20'
          }`}
        >
          <p
            className={`text-xs font-medium ${
              totalWeight === 100 ? 'text-muted-foreground' : 'text-red-800 dark:text-red-400'
            }`}
          >
            Total traffic {totalWeight}%
          </p>
        </div>
      )}
    </div>
  )
}
