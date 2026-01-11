import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LoaderBlock as LoaderBlockType } from '@shopfunnel/core/funnel/types'
import { IconTrash as TrashIcon } from '@tabler/icons-react'
import { Pane } from '../pane'
import { Panel } from '../panel'

export function LoaderBlockPanel({
  block,
  onBlockUpdate,
  onBlockRemove,
}: {
  block: LoaderBlockType
  onBlockUpdate: (block: Partial<LoaderBlockType>) => void
  onBlockRemove: () => void
}) {
  const blockInfo = getBlockInfo(block.type)
  return (
    <Panel>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>{blockInfo?.name}</Pane.Title>
          <Button className="-mr-2" size="icon" variant="ghost" onClick={onBlockRemove}>
            <TrashIcon />
          </Button>
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
