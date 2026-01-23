import { Image as BaseImage, type ImageProps as BaseImageProps } from '@unpic/react/base'
import { URLTransformer } from 'unpic'
import {
  transform as baseTransform,
  type CloudflareOperations,
  type CloudflareOptions,
} from 'unpic/providers/cloudflare'

const transform: URLTransformer<'cloudflare'> = (url, operations) => {
  return baseTransform(url, operations, {
    domain: import.meta.env.VITE_DEV ? import.meta.env.VITE_DOMAIN : undefined,
  })
}

type ImageProps = BaseImageProps<CloudflareOperations, CloudflareOptions>

export function Image(props: Omit<ImageProps, 'transformer'>) {
  return <BaseImage {...(props as ImageProps)} transformer={transform} />
}
