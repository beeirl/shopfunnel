import type { FormTheme } from '@shopfunnel/core/form/theme'
import * as React from 'react'

interface ThemeProps {
  theme: FormTheme
  children: React.ReactNode
}

export function Theme({ theme, children }: ThemeProps) {
  const style = {
    '--color-primary': theme.colors.primary,
    '--color-primary-foreground': theme.colors.primaryForeground,
    '--color-background': theme.colors.background,
    '--color-foreground': theme.colors.foreground,
    '--radius': theme.radius.value,
  } as React.CSSProperties

  return <div style={style}>{children}</div>
}
