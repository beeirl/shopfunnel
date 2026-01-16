declare module '*.svg?react' {
  import * as React from 'react'
  const component: React.FunctionComponent<React.SVGAttributes<React.SVGElement>>
  export default component
}
