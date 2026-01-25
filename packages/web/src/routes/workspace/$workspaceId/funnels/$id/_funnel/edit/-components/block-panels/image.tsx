import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import type { ImageBlock as ImageBlockType } from '@shopfunnel/core/funnel/types'
import { IconTrash as TrashIcon } from '@tabler/icons-react'
import { MediaPicker } from '../media-picker'
import { Pane } from '../pane'
import { Panel } from '../panel'

export function ImageBlockPanel({
  block,
  onBlockUpdate,
  onImageUpload,
  onBlockRemove,
}: {
  block: ImageBlockType
  onBlockUpdate: (block: Partial<ImageBlockType>) => void
  onImageUpload: (file: File) => Promise<string>
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
            <MediaPicker.Root
              value={block.properties.url ? { type: 'image', value: block.properties.url } : undefined}
              onValueChange={async (type, value) => {
                if (type === 'image' && value instanceof File) {
                  const url = await onImageUpload(value)
                  onBlockUpdate({ properties: { ...block.properties, url } })
                } else {
                  onBlockUpdate({ properties: { ...block.properties, url: '' } })
                }
              }}
            >
              <MediaPicker.Trigger render={<MediaPicker.Input />} />
              <MediaPicker.Content side="left" align="start">
                <MediaPicker.ImagePicker />
              </MediaPicker.Content>
            </MediaPicker.Root>
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
