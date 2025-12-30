import { Block } from '@/components/block'
import { NextButton } from '@/components/next-button'
import { cn } from '@/lib/utils'
import type { Page, Theme } from '@shopfunnel/core/form/types'
import * as React from 'react'

export function Preview({
  page,
  theme,
  selectedBlockId,
  onBlockSelect,
}: {
  page: Page | null
  theme: Theme
  selectedBlockId: string | null
  onBlockSelect: (blockId: string | null) => void
}) {
  return (
    <div
      className="relative flex flex-1 flex-col overflow-auto"
      style={
        {
          '--sf-color-primary': theme.colors.primary,
          '--sf-color-primary-foreground': theme.colors.primaryForeground,
          '--sf-color-background': theme.colors.background,
          '--sf-color-foreground': theme.colors.foreground,
          '--sf-radius': theme.radius.value,
        } as React.CSSProperties
      }
      onClick={() => onBlockSelect(null)}
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-(--sf-color-background)" />

      {!page ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-lg text-muted-foreground">No blocks on this page</span>
          <span className="mt-1 text-sm text-muted-foreground">Add blocks from the sidebar</span>
        </div>
      ) : (
        <div className="flex min-h-full flex-1 flex-col">
          <div className="flex-1 px-8 pt-11">
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
              <div className="flex-1">
                {page.blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={cn(
                      'relative cursor-pointer',
                      'before:absolute before:-inset-2 before:rounded-[calc(var(--sf-radius)+4px)] before:border before:border-transparent before:ring-3 before:ring-transparent before:transition-all hover:before:border-(--sf-color-primary)/50 hover:before:ring-(--sf-color-primary)/20',
                      selectedBlockId === block.id &&
                        'before:border-(--sf-color-primary)/40 before:ring-(--sf-color-primary)/25',
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      onBlockSelect(block.id)
                    }}
                  >
                    <Block block={block} index={index} static />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {page.properties.showButton && (
            <div className="sticky bottom-0 px-8 pt-4 pb-5">
              <NextButton disabled>{page.properties.buttonText}</NextButton>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
