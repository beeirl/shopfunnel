import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { InputGroup } from '@/components/ui/input-group'
import type { ImageBlock as ImageBlockType } from '@shopfunnel/core/quiz/types'
import { IconPhoto as PhotoIcon, IconTrash as TrashIcon, IconX as XIcon } from '@tabler/icons-react'
import * as React from 'react'
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
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const url = await onImageUpload(file)
      onBlockUpdate({
        properties: { ...block.properties, url },
      })
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleImageClear = () => {
    onBlockUpdate({
      properties: { ...block.properties, url: '' },
    })
  }

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
            <InputGroup.Root>
              <InputGroup.Addon>
                <InputGroup.Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => inputRef.current?.click()}
                  className="size-6 overflow-hidden"
                >
                  {block.properties.url ? (
                    <img src={block.properties.url} alt="" className="size-full rounded object-cover" />
                  ) : (
                    <PhotoIcon />
                  )}
                </InputGroup.Button>
              </InputGroup.Addon>
              <InputGroup.Input
                readOnly
                placeholder="Upload image..."
                value={isUploading ? 'Uploading...' : block.properties.url ? 'Image uploaded' : ''}
                className="cursor-pointer"
                onClick={() => inputRef.current?.click()}
              />
              {block.properties.url && (
                <InputGroup.Addon align="inline-end">
                  <InputGroup.Button size="icon-xs" variant="ghost" onClick={handleImageClear}>
                    <XIcon />
                  </InputGroup.Button>
                </InputGroup.Addon>
              )}
            </InputGroup.Root>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
