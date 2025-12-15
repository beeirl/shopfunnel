import { Theme } from '@shopfunnel/core/funnel/schema'
import { PaneContent, PaneHeader, PaneRoot, PaneTitle } from './pane'
import { StylePicker } from './style-picker'

export function ThemePanel({ theme }: { theme: Theme }) {
  return (
    <div className="flex w-[250px] flex-col border-r border-border bg-background">
      <PaneRoot className="flex h-full flex-col">
        <PaneHeader>
          <PaneTitle>Theme</PaneTitle>
        </PaneHeader>
        <PaneContent className="flex flex-1 flex-col px-2">
          <StylePicker selectedStyleName={theme.style.name} />
        </PaneContent>
      </PaneRoot>
    </div>
  )
}
