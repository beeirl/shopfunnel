import { shouldAutoAdvance } from '@/components/quiz'
import { Input } from '@/components/ui/input'
import type { Page } from '@shopfunnel/core/quiz/types'
import { Pane } from './pane'
import { Panel } from './panel'

export function PagePanel({ page, onPageUpdate }: { page: Page; onPageUpdate: (page: Partial<Page>) => void }) {
  const showButtonText = !shouldAutoAdvance(page.blocks)

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
              placeholder="Page name..."
              onValueChange={(value) => onPageUpdate({ name: value })}
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
                  onValueChange={(value) => onPageUpdate({ properties: { ...page.properties, buttonText: value } })}
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
              onValueChange={(value) => onPageUpdate({ properties: { ...page.properties, redirectUrl: value } })}
            />
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
