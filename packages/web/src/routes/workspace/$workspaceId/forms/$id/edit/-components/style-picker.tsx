import { type StyleName, STYLES } from '@shopfunnel/core/form/theme'
import * as React from 'react'
import { Picker } from './picker'

const STYLE_DESCRIPTIONS: Record<StyleName, string> = {
  standard: 'Clean, neutral, and with generous spacing.',
  compact: ' Reduced padding and margins for dense content.',
}

const STYLE_TITLES: Record<StyleName, string> = {
  standard: 'Standard',
  compact: 'Compact',
}

const STYLE_ICONS = {
  standard: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="128"
      height="128"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      color="currentColor"
    >
      <path
        d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
  compact: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="128"
      height="128"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      color="currentColor"
    >
      <path
        d="M2 12C2 9.19974 2 7.79961 2.54497 6.73005C3.02433 5.78924 3.78924 5.02433 4.73005 4.54497C5.79961 4 7.19974 4 10 4H14C16.8003 4 18.2004 4 19.27 4.54497C20.2108 5.02433 20.9757 5.78924 21.455 6.73005C22 7.79961 22 9.19974 22 12C22 14.8003 22 16.2004 21.455 17.27C20.9757 18.2108 20.2108 18.9757 19.27 19.455C18.2004 20 16.8003 20 14 20H10C7.19974 20 5.79961 20 4.73005 19.455C3.78924 18.9757 3.02433 18.2108 2.54497 17.27C2 16.2004 2 14.8003 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

const styles = STYLES.map((style) => ({
  ...style,
  icon: STYLE_ICONS[style.name],
  title: STYLE_TITLES[style.name],
  description: STYLE_DESCRIPTIONS[style.name],
}))

export function StylePicker({
  selectedStyleName,
  onStyleChange,
}: {
  selectedStyleName: StyleName
  onStyleChange: (styleName: StyleName) => void
}) {
  const selectedStyle = styles.find((style) => style.name === selectedStyleName)
  return (
    <Picker.Root>
      <div className="group/picker relative">
        <Picker.Trigger>
          <div className="flex flex-col justify-start text-left">
            <div className="text-xs text-muted-foreground">Style</div>
            <div className="text-xs font-medium text-foreground">{selectedStyle?.title}</div>
          </div>
          {selectedStyle?.icon && (
            <div className="absolute top-1/2 right-4 flex size-4 -translate-y-1/2 items-center justify-center">
              {React.cloneElement(selectedStyle.icon, {
                className: 'size-4',
              })}
            </div>
          )}
        </Picker.Trigger>
      </div>
      <Picker.Content className="md:w-64" align="start" side="right">
        <Picker.RadioGroup value={selectedStyleName} onValueChange={(value) => onStyleChange(value as StyleName)}>
          <Picker.Group>
            {styles.map((style, index) => (
              <React.Fragment key={style.name}>
                <Picker.RadioItem value={style.name}>
                  <div className="flex items-start gap-2">
                    {style.icon && (
                      <div className="flex size-4 translate-y-0.5 items-center justify-center">
                        {React.cloneElement(style.icon, {
                          className: 'size-4',
                        })}
                      </div>
                    )}
                    <div className="flex flex-col justify-start pointer-coarse:gap-1">
                      <div>{style.title}</div>
                      <div className="text-xs text-muted-foreground pointer-coarse:text-sm">{style.description}</div>
                    </div>
                  </div>
                </Picker.RadioItem>
                {index < STYLES.length - 1 && <Picker.Separator className="opacity-50" />}
              </React.Fragment>
            ))}
          </Picker.Group>
        </Picker.RadioGroup>
      </Picker.Content>
    </Picker.Root>
  )
}
