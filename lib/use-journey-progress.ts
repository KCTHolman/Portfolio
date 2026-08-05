'use client'

/* ==========================================================================
   Scroll -> voortgang voor de journey-vloot.

   Naar het patroon van components/readme/readme-outline.tsx: één
   rAF-gecoalesceerde scroll/resize-listener, passieve events, opruiming bij
   unmount. Het resultaat is een ref, geen state — dit verandert elke
   scroll-frame, en een useState hier zou de hele pagina 60x per seconde laten
   her-renderen. lib/use-fleet-scene.ts leest 'm rechtstreeks, net zoals het nu
   al met de muispositie doet.
   ========================================================================== */

import { useEffect, useRef, type RefObject } from 'react'

/** Ankerlijn op halverwege het scherm: de sectie waarvan de bovenkant het
 *  laatst voorbij deze lijn kwam, is de actieve. */
const LINE_FRACTION = 0.5

export function useJourneyProgress(sectionIds: readonly string[]): RefObject<number> {
  const progressRef = useRef(0)

  useEffect(() => {
    let queued = false

    function measure(): void {
      queued = false
      const line = window.innerHeight * LINE_FRACTION
      const els = sectionIds
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null)
      if (els.length === 0) return

      let i = 0
      for (let n = 0; n < els.length; n++) {
        if (els[n].getBoundingClientRect().top <= line) i = n
      }

      let frac = 1
      if (i < els.length - 1) {
        const top = els[i].getBoundingClientRect().top
        const nextTop = els[i + 1].getBoundingClientRect().top
        const span = nextTop - top
        frac = span > 0 ? Math.min(1, Math.max(0, (line - top) / span)) : 0
      }

      progressRef.current = i + frac
    }

    function onScroll(): void {
      if (queued) return
      queued = true
      requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sectionIds is een module-level array, stabiel over renders
  }, [])

  return progressRef
}
