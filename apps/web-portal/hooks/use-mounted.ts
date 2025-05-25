import { useEffect, useState } from 'react'

/**
 * Hook to prevent hydration mismatches by ensuring component is mounted on client
 * Returns true only after the component has mounted on the client side
 */
export function useMounted() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}
