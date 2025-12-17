import { blockRegistry } from '@/form/block/registry'
import type { Block, MultipleChoiceBlock, ShortTextBlock } from '@shopfunnel/core/form/schema'
import { MultipleChoicePane } from './multiple-choice-pane'
import { Panel } from './panel'
import { ShortTextPane } from './short-text-pane'

export function RightPanel({
  block,
  onBlockUpdate,
}: {
  block: Block | null
  onBlockUpdate: (blockId: string, updates: Partial<Block>) => void
}) {
  if (!block) return null

  const item = blockRegistry[block.type]

  const handleUpdate = (updates: Partial<Block>) => {
    onBlockUpdate(block.id, updates)
  }

  function renderPanes() {
    switch (block?.type) {
      case 'short_text':
        return <ShortTextPane block={block} onUpdate={handleUpdate as (updates: Partial<ShortTextBlock>) => void} />
      case 'multiple_choice':
        return (
          <MultipleChoicePane
            block={block}
            onUpdate={handleUpdate as (updates: Partial<MultipleChoiceBlock>) => void}
          />
        )
      default:
        return null
    }
  }

  return (
    <Panel.Root className="w-[350px]">
      <Panel.Header>
        <Panel.Title>{item.name}</Panel.Title>
      </Panel.Header>
      <Panel.Content>{renderPanes()}</Panel.Content>
    </Panel.Root>
  )
}
