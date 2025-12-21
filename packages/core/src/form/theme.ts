// ============================================
// Colors
// ============================================

export interface Colors {
  primary: string
  primaryForeground: string
  background: string
  foreground: string
}

// ============================================
// Radii
// ============================================

export const RADII = [
  { name: 'none', value: '0' },
  { name: 'small', value: '0.45rem' },
  { name: 'medium', value: '0.625rem' },
  { name: 'large', value: '0.875rem' },
] as const

export type Radius = (typeof RADII)[number]
export type RadiusName = Radius['name']
export type RadiusValue = Radius['value']

// ============================================
// Form Theme
// ============================================

export interface FormTheme {
  colors: Colors
  radius: Radius
}
