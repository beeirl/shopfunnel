import { COLORS, RADII, STYLES, type FormTheme } from '@shopfunnel/core/form/theme'
import { ColorPicker } from './color-picker'
import { PaneContent, PaneHeader, PaneRoot, PaneTitle } from './pane'
import { RadiusPicker } from './radius-picker'
import { StylePicker } from './style-picker'

interface ThemePanelProps {
  theme: FormTheme
  onThemeUpdate: (updates: Partial<FormTheme>) => void
}

export function ThemePanel({ theme, onThemeUpdate }: ThemePanelProps) {
  return (
    <div className="flex w-[250px] flex-col border-r border-border bg-background">
      <PaneRoot className="flex h-full flex-col">
        <PaneHeader>
          <PaneTitle>Theme</PaneTitle>
        </PaneHeader>
        <PaneContent className="flex flex-1 flex-col px-2">
          <StylePicker
            selectedStyleName={theme.style.name}
            onStyleChange={(styleName) => {
              const style = STYLES.find((s) => s.name === styleName)
              if (style) onThemeUpdate({ style })
            }}
          />
          <ColorPicker
            selectedColorName={theme.color.name}
            onColorChange={(colorName) => {
              const color = COLORS.find((c) => c.name === colorName)
              if (color) onThemeUpdate({ color })
            }}
          />
          <RadiusPicker
            selectedRadiusName={theme.radius.name}
            onRadiusChange={(radiusName) => {
              const radius = RADII.find((r) => r.name === radiusName)
              if (radius) onThemeUpdate({ radius })
            }}
          />
        </PaneContent>
      </PaneRoot>
    </div>
  )
}
