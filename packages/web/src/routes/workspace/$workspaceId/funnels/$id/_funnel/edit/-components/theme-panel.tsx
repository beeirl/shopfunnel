import { ColorPicker } from '@/components/ui/color-picker'
import { InputGroup } from '@/components/ui/input-group'
import { Select } from '@/components/ui/select'
import { type Theme } from '@shopfunnel/core/funnel/types'
import { IconUpload as UploadIcon, IconX as XIcon } from '@tabler/icons-react'
import * as React from 'react'
import { Field } from './field'
import { Pane } from './pane'
import { Panel } from './panel'

const RADII: { value: Theme['radius']; label: string }[] = [
  { label: 'None', value: '0rem' },
  { label: 'Small', value: '0.45rem' },
  { label: 'Medium', value: '0.625rem' },
  { label: 'Large', value: '0.875rem' },
]

const STYLES: { value: Theme['style']; label: string }[] = [
  { label: 'Outline', value: 'outline' },
  { label: 'Soft', value: 'soft' },
]

interface ThemePanelProps {
  theme: Theme
  onThemeUpdate: (updates: Partial<Theme>) => void
  onImageUpload?: (file: File) => Promise<string>
}

export function ThemePanel({ theme, onThemeUpdate, onImageUpload }: ThemePanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const handleColorChange = (key: keyof Theme['colors'], value: string) => {
    onThemeUpdate({
      colors: {
        ...theme.colors,
        [key]: value,
      },
    })
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImageUpload) return

    setIsUploading(true)
    try {
      const url = await onImageUpload(file)
      onThemeUpdate({ logo: url })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleLogoRemove = () => {
    onThemeUpdate({ logo: undefined })
  }

  return (
    <Panel>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>Design</Pane.Title>
        </Pane.Header>
        <Pane.Content>
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Logo</Pane.GroupLabel>
            </Pane.GroupHeader>
            <InputGroup.Root>
              <InputGroup.Addon>
                {theme.logo ? (
                  <img src={theme.logo} alt="Logo" className="size-6 rounded object-contain" />
                ) : (
                  <UploadIcon className="size-4" />
                )}
              </InputGroup.Addon>
              <InputGroup.Input
                readOnly
                placeholder="Upload logo"
                value={isUploading ? 'Uploading...' : theme.logo ? 'Image' : ''}
                className="cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              />
              {theme.logo && (
                <InputGroup.Addon align="inline-end">
                  <InputGroup.Button size="icon-xs" variant="ghost" onClick={handleLogoRemove}>
                    <XIcon className="size-4" />
                  </InputGroup.Button>
                </InputGroup.Addon>
              )}
            </InputGroup.Root>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </Pane.Group>
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Border Radius</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Select.Root
              items={RADII}
              value={theme.radius}
              onValueChange={(value) => onThemeUpdate({ radius: value! })}
            >
              <Select.Trigger className="w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  className="size-4 text-muted-foreground"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 20v-5C4 8.925 8.925 4 15 4h5"
                  />
                </svg>
                <Select.Value />
              </Select.Trigger>
              <Select.Content alignItemWithTrigger={false}>
                <Select.Group>
                  {RADII.map((radius) => (
                    <Select.Item key={radius.value} value={radius.value}>
                      {radius.label}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Pane.Group>
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Style</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Select.Root items={STYLES} value={theme.style} onValueChange={(value) => onThemeUpdate({ style: value! })}>
              <Select.Trigger className="w-full">
                <Select.Value />
              </Select.Trigger>
              <Select.Content alignItemWithTrigger={false}>
                <Select.Group>
                  {STYLES.map((style) => (
                    <Select.Item key={style.value} value={style.value}>
                      {style.label}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Pane.Group>
          <Pane.Separator />
          <Pane.Group>
            <Pane.GroupHeader>
              <Pane.GroupLabel>Colors</Pane.GroupLabel>
            </Pane.GroupHeader>
            <Field.Root>
              <Field.Label>Accent</Field.Label>
              <Field.Control>
                <InputGroup.Root>
                  <InputGroup.Addon>
                    <ColorPicker.Root>
                      <ColorPicker.Trigger
                        render={
                          <InputGroup.Button
                            size="icon-xs"
                            variant="outline"
                            style={{ backgroundColor: theme.colors.primary }}
                          />
                        }
                      />
                      <ColorPicker.Content
                        value={theme.colors.primary}
                        onValueChange={(value) => handleColorChange('primary', value)}
                      />
                    </ColorPicker.Root>
                  </InputGroup.Addon>
                  <InputGroup.Input
                    value={theme.colors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                  />
                </InputGroup.Root>
              </Field.Control>
            </Field.Root>
            <Field.Root>
              <Field.Label>Accent text</Field.Label>
              <Field.Control>
                <InputGroup.Root>
                  <InputGroup.Addon>
                    <ColorPicker.Root>
                      <ColorPicker.Trigger
                        render={
                          <InputGroup.Button
                            size="icon-xs"
                            variant="outline"
                            style={{ backgroundColor: theme.colors.primaryForeground }}
                          />
                        }
                      />
                      <ColorPicker.Content
                        value={theme.colors.primaryForeground}
                        onValueChange={(value) => handleColorChange('primaryForeground', value)}
                      />
                    </ColorPicker.Root>
                  </InputGroup.Addon>
                  <InputGroup.Input
                    value={theme.colors.primaryForeground}
                    onChange={(e) => handleColorChange('primaryForeground', e.target.value)}
                  />
                </InputGroup.Root>
              </Field.Control>
            </Field.Root>
            <Field.Root>
              <Field.Label>Text</Field.Label>
              <Field.Control>
                <InputGroup.Root>
                  <InputGroup.Addon>
                    <ColorPicker.Root>
                      <ColorPicker.Trigger
                        render={
                          <InputGroup.Button
                            size="icon-xs"
                            variant="outline"
                            style={{ backgroundColor: theme.colors.foreground }}
                          />
                        }
                      />
                      <ColorPicker.Content
                        value={theme.colors.foreground}
                        onValueChange={(value) => handleColorChange('foreground', value)}
                      />
                    </ColorPicker.Root>
                  </InputGroup.Addon>
                  <InputGroup.Input
                    value={theme.colors.foreground}
                    onChange={(e) => handleColorChange('foreground', e.target.value)}
                  />
                </InputGroup.Root>
              </Field.Control>
            </Field.Root>
          </Pane.Group>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
