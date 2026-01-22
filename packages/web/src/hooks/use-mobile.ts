import { useEffect, useState } from 'react'

export function useMobile(mobileBreakpoint = 768) {
  const [mobile, setMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${mobileBreakpoint - 1}px)`)
    const onChange = () => {
      setMobile(window.innerWidth < mobileBreakpoint)
    }
    mql.addEventListener('change', onChange)
    setMobile(window.innerWidth < mobileBreakpoint)
    return () => mql.removeEventListener('change', onChange)
  }, [mobileBreakpoint])

  return !!mobile
}
