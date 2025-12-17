import { ColorPicker } from '@/components/ui/color-picker'
import { InputGroup } from '@/components/ui/input-group'
import { Popover } from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import { RADII, type FormTheme, type FormThemeColors } from '@shopfunnel/core/form/theme'
import * as React from 'react'
import { Field } from './field'

interface ThemePopoverContentProps extends React.ComponentProps<typeof Popover.Content> {
  theme: FormTheme
  onThemeUpdate: (updates: Partial<FormTheme>) => void
}

function ThemePopoverContent({ theme, onThemeUpdate, ...props }: ThemePopoverContentProps) {
  const handleColorChange = (key: keyof FormThemeColors, value: string) => {
    onThemeUpdate({
      colors: {
        ...theme.colors,
        [key]: value,
      },
    })
  }

  return (
    <Popover.Content className="w-[350px]" {...props}>
      <Popover.Header>
        <Popover.Title>Theme</Popover.Title>
      </Popover.Header>
      <div className="flex flex-col">
        <Field.Root className="px-0">
          <Field.Label>Primary</Field.Label>
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
        <Field.Root className="px-0">
          <Field.Label>Primary text</Field.Label>
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
        <Field.Root className="px-0">
          <Field.Label>Background</Field.Label>
          <Field.Control>
            <InputGroup.Root>
              <InputGroup.Addon>
                <ColorPicker.Root>
                  <ColorPicker.Trigger
                    render={
                      <InputGroup.Button
                        size="icon-xs"
                        variant="outline"
                        style={{ backgroundColor: theme.colors.background }}
                      />
                    }
                  />
                  <ColorPicker.Content
                    value={theme.colors.background}
                    onValueChange={(value) => handleColorChange('background', value)}
                  />
                </ColorPicker.Root>
              </InputGroup.Addon>
              <InputGroup.Input
                value={theme.colors.background}
                onChange={(e) => handleColorChange('background', e.target.value)}
              />
            </InputGroup.Root>
          </Field.Control>
        </Field.Root>
        <Field.Root className="px-0">
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
        <Field.Root className="px-0">
          <Field.Label>Radius</Field.Label>
          <Field.Control>
            <Select.Root
              value={theme.radius.name}
              onValueChange={(name) => {
                const radius = RADII.find((r) => r.name === name)
                if (radius) onThemeUpdate({ radius })
              }}
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
                <Select.Value className="capitalize" />
              </Select.Trigger>
              <Select.Content alignItemWithTrigger={false}>
                <Select.Group>
                  {RADII.map((r) => (
                    <Select.Item key={r.name} value={r.name} className="capitalize">
                      {r.name}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </Field.Control>
        </Field.Root>
      </div>
    </Popover.Content>
  )
}

export const ThemePopover = {
  Root: Popover.Root,
  Trigger: Popover.Trigger,
  Content: ThemePopoverContent,
}
