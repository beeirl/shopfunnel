import { getBlockInfo } from '@/components/block'
import { Input } from '@/components/ui/input'
import type { LoaderBlock as LoaderBlockType } from '@shopfunnel/core/quiz/types'
import { Pane } from '../pane'
import { Panel } from '../panel'

export function LoaderBlockPanel({
  block,
  onBlockUpdate,
}: {
  block: LoaderBlockType
  onBlockUpdate: (block: Partial<LoaderBlockType>) => void
}) {
  const blockInfo = getBlockInfo(block.type)
  return (
    <Panel>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>{blockInfo?.name}</Pane.Title>
        </Pane.Header>
        <Pane.Content>
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Description</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Input
              placeholder="Loading text..."
              value={block.properties.description ?? ''}
              onValueChange={(value) =>
                onBlockUpdate({
                  properties: { ...block.properties, description: value || undefined },
                })
              }
            />
          </Pane.Group>
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Duration</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Input
              type="number"
              min={1}
              max={30}
              value={block.properties.duration}
              onValueChange={(value) =>
                onBlockUpdate({
                  properties: { ...block.properties, duration: parseFloat(value) || 3 },
                })
              }
            />
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
