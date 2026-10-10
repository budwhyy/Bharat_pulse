import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'

/** False during SSR and hydration, true after mount. Charts measure the DOM, so they wait for this. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

const REDUCED = '(prefers-reduced-motion: reduce)'

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia(REDUCED).matches,
    // Server render assumes reduced motion: nothing animates before hydration.
    () => true,
  )
}

/**
 * The dashboard clock. It starts at the snapshot's generation time so server
 * and client render identical relative times, then ticks after mount.
 */
export const NowContext = createContext<Date>(new Date(0))

export function useNow(): Date {
  return useContext(NowContext)
}

export function useTickingNow(start: string, intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date(start))
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
