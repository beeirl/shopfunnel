import type { FormTheme } from '@shopfunnel/core/form/theme'
import * as React from 'react'

interface ThemeProps {
  theme: FormTheme
  children: React.ReactNode
}

export function Theme({ theme, children }: ThemeProps) {
  const style = {
    '--primary': theme.color.value.light.primary,
    '--primary-foreground': theme.color.value.light.primaryForeground,
    '--secondary': theme.color.value.light.secondary,
    '--secondary-foreground': theme.color.value.light.secondaryForeground,
    '--radius': theme.radius.value,
  } as React.CSSProperties

  return <div style={style}>{children}</div>
}
