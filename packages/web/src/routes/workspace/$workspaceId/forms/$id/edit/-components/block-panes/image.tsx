import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { getFormBlockType } from '@/form/block'
import type { ImageBlock as ImageBlockData } from '@shopfunnel/core/form/types'
import * as React from 'react'
import { Field } from '../field'
import { Pane } from '../pane'

const ASPECT_RATIO_OPTIONS = [
  { value: '16/9', label: '16:9' },
  { value: '4/3', label: '4:3' },
  { value: '1/1', label: '1:1' },
  { value: '3/2', label: '3:2' },
] as const

export function ImageBlockPane({
  data,
  onDataUpdate,
  onImageUpload,
}: {
  data: ImageBlockData
  onDataUpdate: (data: Partial<ImageBlockData>) => void
  onImageUpload: (file: File) => Promise<string>
}) {
  const block = getFormBlockType(data.type)
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
          <Field.Root>
            <Field.Label>Aspect Ratio</Field.Label>
            <Field.Control>
              <Select.Root
                value={data.properties.aspectRatio}
                onValueChange={(value) =>
                  onDataUpdate({
                    properties: {
                      ...data.properties,
                      aspectRatio: value as ImageBlockData['properties']['aspectRatio'],
                    },
                  })
                }
              >
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    {ASPECT_RATIO_OPTIONS.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </Field.Control>
          </Field.Root>
        </Pane.Group>
      </Pane.Content>
    </Pane.Root>
  )
}
