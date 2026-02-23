// @ts-nocheck
import { Font, Text as JEText, type TextProps } from 'jsx-email'
import React from 'react'
import { baseText } from './styles'

export function Text(props: TextProps) {
  return <JEText {...props} style={{ ...baseText, ...props.style }} />
}

export function Title({ children }: { children: React.ReactNode }) {
  return React.createElement('title', null, children)
}

export function A({
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) {
  return React.createElement('a', props, children)
}

export function Span({ children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) {
  return React.createElement('span', props, children)
}

export function Br() {
  return React.createElement('br')
}

export function Wbr(props: React.HTMLAttributes<HTMLElement>) {
  return React.createElement('wbr', props)
}

export function Fonts({ assetsUrl }: { assetsUrl: string }) {
  return (
    <>
      <Font
        fontFamily="Inter"
        fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
        webFont={{
          url: `${assetsUrl}/Inter-Regular.woff2`,
          format: 'woff2',
        }}
        fontWeight="400"
        fontStyle="normal"
      />
      <Font
        fontFamily="Inter"
        fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
        webFont={{
          url: `${assetsUrl}/Inter-Medium.woff2`,
          format: 'woff2',
        }}
        fontWeight="500"
        fontStyle="normal"
      />
      <Font
        fontFamily="Inter"
        fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
        webFont={{
          url: `${assetsUrl}/Inter-SemiBold.woff2`,
          format: 'woff2',
        }}
        fontWeight="600"
        fontStyle="normal"
      />
      <Font
        fontFamily="Inter"
        fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
        webFont={{
          url: `${assetsUrl}/Inter-Bold.woff2`,
          format: 'woff2',
        }}
        fontWeight="700"
        fontStyle="normal"
      />
    </>
  )
}

export function SplitString({ text, split }: { text: string; split: number }) {
  const segments: JSX.Element[] = []
  for (let i = 0; i < text.length; i += split) {
    segments.push(<>{text.slice(i, i + split)}</>)
    if (i + split < text.length) {
      segments.push(<Wbr key={`${i}wbr`} />)
    }
  }
  return <>{segments}</>
}
