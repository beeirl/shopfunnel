import { shouldAutoAdvance } from '@/components/funnel'
import { Input } from '@/components/ui/input'
import { INPUT_BLOCKS, type Block, type Page } from '@shopfunnel/core/funnel/types'
import { getBlockName, getDefaultPageName } from '../-common'
import { useFunnelEditor } from '../-context'
import { useFunnel } from '../../-context'
import { Pane } from './pane'
import { Panel } from './panel'

// =============================================================================
// PagePanel
// =============================================================================

export function PagePanel() {
  const { data: funnel, maybeSave } = useFunnel()
  const { selectedPage } = useFunnelEditor()

  if (!selectedPage) return null

  const page = selectedPage
  const pageIndex = funnel.pages.findIndex((p) => p.id === page.id)
  const showButtonText = !shouldAutoAdvance(page.blocks)

  const handlePageUpdate = (updates: Partial<Page>) => {
    // If name is being updated, also update input block names
    let updatedBlocks: Block[] = page.blocks
    if ('name' in updates) {
      const newBlockName = getBlockName(updates.name, pageIndex)
      updatedBlocks = page.blocks.map((block): Block => {
        if (INPUT_BLOCKS.includes(block.type as (typeof INPUT_BLOCKS)[number]) && 'name' in block.properties) {
          return { ...block, properties: { ...block.properties, name: newBlockName } } as Block
        }
        return block
      })
    }

    const updatedPages = funnel.pages.map((p) => (p.id === page.id ? { ...p, ...updates, blocks: updatedBlocks } : p))
    maybeSave({ pages: updatedPages })
  }

  return (
    <Panel>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>Page</Pane.Title>
        </Pane.Header>
        <Pane.Content>
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Name</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Input
              value={page.name}
              placeholder={getDefaultPageName(pageIndex)}
              onValueChange={(value) => handlePageUpdate({ name: value })}
            />
          </Pane.Group>
          {showButtonText && (
            <>
              <Pane.Separator />
              <Pane.Group>
                <Pane.GroupHeader>
                  <Pane.GroupLabel>Button Text</Pane.GroupLabel>
                </Pane.GroupHeader>
                <Input
                  value={page.properties?.buttonText ?? 'Next'}
                  placeholder="Button text..."
                  onValueChange={(value) => handlePageUpdate({ properties: { ...page.properties, buttonText: value } })}
                />
              </Pane.Group>
            </>
          )}
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Redirect URL</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Input
              value={page.properties?.redirectUrl ?? ''}
              placeholder="https://..."
              onValueChange={(value) => handlePageUpdate({ properties: { ...page.properties, redirectUrl: value } })}
            />
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
