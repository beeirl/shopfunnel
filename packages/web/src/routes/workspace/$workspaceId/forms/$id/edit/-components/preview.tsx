import { Button } from '@/components/ui/button'
import { FormGroup } from '@/form/group'
import { FormPage } from '@/form/page'
import type { Page, Theme } from '@shopfunnel/core/form/types'
import { IconDeviceDesktop as DesktopIcon, IconDeviceMobile as MobileIcon } from '@tabler/icons-react'
import * as React from 'react'

type DisplayMode = 'desktop' | 'mobile'

export function Preview({
  page,
  theme,
  selectedBlockId,
  onBlockSelect,
}: {
  page: Page | null
  theme: Theme
  selectedBlockId: string | null
  onBlockSelect: (blockId: string | null) => void
}) {
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('mobile')
  return (
    <FormGroup className="relative flex flex-1 flex-col overflow-auto" theme={theme}>
      {!page ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-lg text-muted-foreground">No blocks on this page</span>
          <span className="mt-1 text-sm text-muted-foreground">Add blocks from the sidebar</span>
        </div>
      ) : (
        <FormPage static page={page} />
      )}
      <Button
        variant="outline"
        className="absolute right-4 bottom-4"
        onClick={() => setDisplayMode(displayMode === 'desktop' ? 'mobile' : 'desktop')}
      >
        {displayMode === 'desktop' ? <DesktopIcon /> : <MobileIcon />}
        {displayMode === 'desktop' ? 'Desktop' : 'Mobile'}
      </Button>
    </FormGroup>
  )
}
