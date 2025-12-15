import { type ColorName, COLORS } from '@shopfunnel/core/funnel/theme'
import { Picker } from './picker'

const COLOR_TITLES = {
  blue: 'Blue',
}

export function ColorPicker({ selectedColorName }: { selectedColorName: ColorName }) {
  const colors = COLORS.map((color) => ({
    ...color,
    title: COLOR_TITLES[color.name],
  }))
  const selectedColor = colors.find((color) => color.name === selectedColorName)
  return (
    <Picker.Root>
      <Picker.Trigger>
        <div className="flex flex-col justify-start text-left">
          <div className="text-xs text-muted-foreground">Color</div>
          <div className="text-sm font-medium text-foreground">{selectedColor?.title}</div>
        </div>
        <div
          style={
            {
              '--color': selectedColor?.value.light.primary,
            } as React.CSSProperties
          }
          className="absolute top-1/2 right-4 size-4 -translate-y-1/2 rounded-full bg-(--color)"
        />
      </Picker.Trigger>
      <Picker.Content side="right" align="start" className="max-h-96">
        <Picker.RadioGroup>
          <Picker.Group>
            {colors.map((color) => {
              return (
                <Picker.RadioItem key={color.name} value={color.name}>
                  <div className="flex items-center gap-2">
                    <div
                      style={
                        {
                          '--color': color.value.light.primary,
                        } as React.CSSProperties
                      }
                      className="size-4 rounded-full bg-(--color)"
                    />
                    {color.title}
                  </div>
                </Picker.RadioItem>
              )
            })}
          </Picker.Group>
        </Picker.RadioGroup>
      </Picker.Content>
    </Picker.Root>
  )
}
