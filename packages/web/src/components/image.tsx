import { useMemo, type ComponentProps } from 'react'

type ImageSize = 'xs' | 'sm' | 'md' | 'lg'

const IMAGE_WIDTHS: Record<ImageSize, number> = {
  xs: 300,
  sm: 600,
  md: 1000,
  lg: 1500,
}

interface ImageProps extends ComponentProps<'img'> {
  size?: ImageSize
}

export function Image({ src: srcProp, size = 'lg', ...props }: ImageProps) {
  const src = useMemo(() => {
    if (!srcProp) return
    if (!/^https:\/\/storage\./.test(srcProp)) return srcProp
    const url = new URL(srcProp)
    url.searchParams.set('w', String(IMAGE_WIDTHS[size]))
    url.searchParams.set('q', '85')
    return url.toString()
  }, [srcProp, size])

  return <img src={src} {...props} />
}
