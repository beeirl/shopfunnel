import { getBlockInfo } from '@/components/block'
import { Image } from '@/components/image'
import { Button } from '@/components/ui/button'
import { InputGroup } from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'
import type { HtmlBlock as HtmlBlockType } from '@shopfunnel/core/funnel/types'
import { IconCopy as CopyIcon, IconPhoto as PhotoIcon, IconPlus as PlusIcon } from '@tabler/icons-react'
import { MediaPicker } from '../media-picker'
import { Pane } from '../pane'
import { Panel } from '../panel'

export function HtmlBlockPanel({
  block,
  onBlockUpdate,
  onImageUpload,
  onHtmlChange,
}: {
  block: HtmlBlockType
  onBlockUpdate: (block: Partial<HtmlBlockType>) => void
  onImageUpload: (file: File) => Promise<string>
  onHtmlChange: (html: string) => void
}) {
  const blockInfo = getBlockInfo(block.type)

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
  }

  return (
    <Panel>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>{blockInfo?.name}</Pane.Title>
        </Pane.Header>
        <Pane.Content>
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Content</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Textarea
              className="max-h-96 overflow-y-auto"
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
              <MediaPicker.Root
                onValueChange={async (type, value) => {
                  if (type === 'image' && value instanceof File) {
                    const url = await onImageUpload(value)
                    onBlockUpdate({
                      properties: {
                        ...block.properties,
                        media: [...block.properties.media, { type: 'image', value: url }],
                      },
                    })
                  }
                }}
              >
                <MediaPicker.Trigger
                  render={
                    <Button size="icon-xs" variant="ghost">
                      <PlusIcon />
                    </Button>
                  }
                />
                <MediaPicker.Content side="left" align="start">
                  <MediaPicker.ImagePicker />
                </MediaPicker.Content>
              </MediaPicker.Root>
            </Pane.GroupHeader>
            {block.properties.media.map((item, index) => (
              <InputGroup.Root key={index}>
                <InputGroup.Addon>
                  <InputGroup.Button size="icon-xs" variant="ghost" className="size-6 overflow-hidden">
                    {item.value ? (
                      <Image
                        src={item.value}
                        alt=""
                        layout="fixed"
                        width={24}
                        height={24}
                        className="rounded object-cover"
                      />
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
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
