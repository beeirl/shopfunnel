import { getBlockInfo } from '@/components/block'
import { Input } from '@/components/ui/input'
import type { LoaderBlock as LoaderBlockData } from '@shopfunnel/core/form/types'
import { Pane } from '../pane'

export function LoaderBlockPane({
  data,
  onDataUpdate,
}: {
  data: LoaderBlockData
  onDataUpdate: (data: Partial<LoaderBlockData>) => void
}) {
  const block = getBlockInfo(data.type)
  return (
    <Pane.Root>
      <Pane.Header>
        <Pane.Title>{block?.name}</Pane.Title>
      </Pane.Header>
      <Pane.Content>
        <Pane.Group>
          <Pane.GroupHeader>
            <Pane.GroupLabel>Description</Pane.GroupLabel>
          </Pane.GroupHeader>
          <Input
            placeholder="Loading text..."
            value={data.properties.description ?? ''}
            onValueChange={(value) =>
              onDataUpdate({
                properties: { ...data.properties, description: value || undefined },
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
            value={data.properties.duration}
            onValueChange={(value) =>
              onDataUpdate({
                properties: { ...data.properties, duration: parseFloat(value) || 3 },
              })
            }
          />
        </Pane.Group>
      </Pane.Content>
    </Pane.Root>
  )
}
