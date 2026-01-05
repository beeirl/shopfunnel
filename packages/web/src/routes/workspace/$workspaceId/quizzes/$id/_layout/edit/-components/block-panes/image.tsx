import { getBlockInfo } from '@/components/block'
import { Input } from '@/components/ui/input'
import type { ImageBlock as ImageBlockType } from '@shopfunnel/core/quiz/types'
import * as React from 'react'
import { Field } from '../field'
import { Pane } from '../pane'

export function ImageBlockPane({
  block,
  onBlockUpdate,
  onImageUpload,
}: {
  block: ImageBlockType
  onBlockUpdate: (block: Partial<ImageBlockType>) => void
  onImageUpload: (file: File) => Promise<string>
}) {
  const blockInfo = getBlockInfo(block.type)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = await onImageUpload(file)
    onBlockUpdate({
      properties: { ...block.properties, url },
    })

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <Pane.Root>
      <Pane.Header>
        <Pane.Title>{blockInfo?.name}</Pane.Title>
      </Pane.Header>
      <Pane.Content>
        <Pane.Group>
          <Field.Root>
            <Field.Label>File</Field.Label>
            <Field.Control>
              <Input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
              />
            </Field.Control>
          </Field.Root>
        </Pane.Group>
      </Pane.Content>
    </Pane.Root>
  )
}
