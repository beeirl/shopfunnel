import { Block } from '@/form/block'
import { Theme as ThemeComponent } from '@/form/theme'
import { cn } from '@/lib/utils'
import type { Page } from '@shopfunnel/core/form/schema'
import type { FormTheme } from '@shopfunnel/core/form/theme'

export function Preview({
  page,
  theme,
  selectedBlockId,
  onBlockSelect,
}: {
  page: Page | null
  theme: FormTheme
  selectedBlockId: string | null
  onBlockSelect: (blockId: string | null) => void
}) {
  const blocks = page?.blocks ?? []
  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-lg text-muted-foreground">No blocks on this page</span>
              <span className="mt-1 text-sm text-muted-foreground">Add blocks from the sidebar</span>
            </div>
          ) : (
            blocks.map((block) => (
              <div
                key={block.id}
                onClick={() => onBlockSelect(block.id)}
                className={cn(
                  'cursor-pointer rounded-xl border border-transparent p-4 ring ring-transparent transition-all',
                  'hover:border-ring hover:ring-3 hover:ring-ring/50',
                  selectedBlockId === block.id && 'border-ring ring-3 ring-ring/50 hover:ring-ring/50',
                )}
              >
                <ThemeComponent theme={theme}>
                  <Block mode="preview" block={block} />
                </ThemeComponent>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
