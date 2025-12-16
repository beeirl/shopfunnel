import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { IconTableDashed as TableDashedIcon, IconPalette as ThemeIcon } from '@tabler/icons-react'

export type NavbarTab = 'explorer' | 'theme'

interface NavbarProps {
  activeTab: NavbarTab
  onTabChange: (tab: NavbarTab) => void
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <div className="flex w-12 flex-col items-center gap-1 border-r border-border bg-background py-2">
      <Button
        size="icon"
        variant="ghost"
        className={cn(activeTab === 'explorer' && 'bg-muted')}
        onClick={() => onTabChange('explorer')}
      >
        <TableDashedIcon />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className={cn(activeTab === 'theme' && 'bg-muted')}
        onClick={() => onTabChange('theme')}
      >
        <ThemeIcon />
      </Button>
    </div>
  )
}
