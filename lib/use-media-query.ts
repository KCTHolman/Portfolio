'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Leest een media query en blijft meelopen als hij omslaat.
 *
 * De serverwaarde is bewust `false`: op de server is er geen viewport, en
 * elke andere aanname zou de eerste client-render laten afwijken van de HTML.
 * De echte waarde komt binnen bij hydration — precies één frame later, en
 * alles wat hierop hangt is decoratief.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Bezoeker heeft in het systeem om minder beweging gevraagd. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/**
 * Telefoonbreedte — hetzelfde breekpunt dat de layout al als "telefoon"
 * behandelt. De wash en de vloot zetten hier één stilstaand beeld neer in
 * plaats van een lopende animatie.
 */
export function useNarrowScreen(): boolean {
  return useMediaQuery('(max-width: 699px)')
}
