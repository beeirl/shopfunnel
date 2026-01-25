import { shouldAutoAdvance } from '@/components/funnel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Page } from '@shopfunnel/core/funnel/types'
import { IconTrash as TrashIcon } from '@tabler/icons-react'
import { useFunnelEditor } from '../-context'
import { useFunnel } from '../../-context'
import { Pane } from './pane'
import { Panel } from './panel'

export function PagePanel({ onRemove }: { onRemove: () => void }) {
  const { data: funnel, maybeSave } = useFunnel()
  const { selectedPage } = useFunnelEditor()

  if (!selectedPage) return null

  const page = selectedPage
  const showButtonText = !shouldAutoAdvance(page.blocks)

  const handlePageUpdate = (updates: Partial<Page>) => {
    const updatedPages = funnel.pages.map((p) => (p.id === page.id ? { ...p, ...updates } : p))
    maybeSave({ pages: updatedPages })
  }

  return (
    <Panel>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>Page</Pane.Title>
          <Button className="-mr-2" size="icon" variant="ghost" onClick={onRemove}>
            <TrashIcon />
          </Button>
        </Pane.Header>
        <Pane.Content>
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Name</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Input
              value={page.name}
              placeholder="Page name..."
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
