import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Create stable listener reference that uses MediaQueryListEvent
    const listener = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    
    // Set initial value using the MediaQueryList
    setIsMobile(mql.matches)
    
    // Use modern addEventListener instead of deprecated addListener
    mql.addEventListener('change', listener)
    
    // Cleanup with same listener reference
    return () => mql.removeEventListener('change', listener)
  }, [])

  return !!isMobile
}
