import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { InputGroup } from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'
import type { HtmlBlock as HtmlBlockType } from '@shopfunnel/core/funnel/types'
import {
  IconCopy as CopyIcon,
  IconPhoto as PhotoIcon,
  IconPlus as PlusIcon,
  IconTrash as TrashIcon,
} from '@tabler/icons-react'
import * as React from 'react'
import { Pane } from '../pane'
import { Panel } from '../panel'

export function HtmlBlockPanel({
  block,
  onBlockUpdate,
  onImageUpload,
  onBlockRemove,
  onHtmlChange,
  onHtmlSave,
}: {
  block: HtmlBlockType
  onBlockUpdate: (block: Partial<HtmlBlockType>) => void
  onImageUpload: (file: File) => Promise<string>
  onBlockRemove: () => void
  onHtmlChange: (html: string) => void
  onHtmlSave: () => void
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
        properties: {
          ...block.properties,
          media: [...block.properties.media, { type: 'image', value: url }],
        },
      })
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
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
            <Pane.GroupHeader>
              <Pane.GroupLabel>Content</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Textarea
              placeholder="<div>Your HTML here...</div>"
              value={block.properties.html}
              onChange={(e) => onHtmlChange(e.target.value)}
              rows={8}
            />
          </Pane.Group>
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Media</Pane.GroupLabel>
              <Button
                className="-mr-2"
                size="icon"
                variant="ghost"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                <PlusIcon />
              </Button>
            </Pane.GroupHeader>
            <div className="flex flex-col gap-2">
              {block.properties.media.map((item, index) => (
                <InputGroup.Root key={index}>
                  <InputGroup.Addon>
                    <InputGroup.Button size="icon-xs" variant="ghost" className="size-6 overflow-hidden">
                      {item.value ? (
                        <img src={item.value} alt="" className="size-full rounded object-cover" />
                      ) : (
                        <PhotoIcon />
                      )}
                    </InputGroup.Button>
                  </InputGroup.Addon>
                  <InputGroup.Input readOnly value="Image" />
                  <InputGroup.Addon align="inline-end">
                    <InputGroup.Button size="icon-xs" variant="ghost" onClick={() => handleCopyUrl(item.value)}>
                      <CopyIcon />
                    </InputGroup.Button>
                  </InputGroup.Addon>
                </InputGroup.Root>
              ))}
              {block.properties.media.length === 0 && (
                <span className="text-sm text-muted-foreground">No media uploaded</span>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </Pane.Group>
        </Pane.Content>
        <Pane.Footer>
          <Button className="ml-auto" onClick={onHtmlSave}>
            Save
          </Button>
        </Pane.Footer>
      </Pane.Root>
    </Panel>
  )
}
