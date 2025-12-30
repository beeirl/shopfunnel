import { getBlockInfo } from '@/components/block'
import { Input } from '@/components/ui/input'
import type { ImageBlock as ImageBlockData } from '@shopfunnel/core/form/types'
import * as React from 'react'
import { Field } from '../field'
import { Pane } from '../pane'

export function ImageBlockPane({
  data,
  onDataUpdate,
  onImageUpload,
}: {
  data: ImageBlockData
  onDataUpdate: (data: Partial<ImageBlockData>) => void
  onImageUpload: (file: File) => Promise<string>
}) {
  const block = getBlockInfo(data.type)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = await onImageUpload(file)
    onDataUpdate({
      properties: { ...data.properties, url },
    })

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <Pane.Root>
      <Pane.Header>
        <Pane.Title>{block?.name}</Pane.Title>
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
