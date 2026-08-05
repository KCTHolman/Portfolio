'use client'

/* Tijdelijk, wegwerpbaar: alleen om de journey-morph (boot -> kompas) visueel
   te controleren vóór de overige vier vormen getekend worden (Fase 0 uit het
   plan). progress oscilleert vanzelf 0 -> 1 -> 0, geen scroll-koppeling nog.
   Verwijderen zodra de spike is goedgekeurd. */

import { useEffect, useRef } from 'react'

import { Fleet } from '@/components/fleet'

export default function DevJourneyPreview() {
  const progressRef = useRef(0)

  useEffect(() => {
    let frame: number
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = (now - t0) / 1000
      // 0 -> 1 -> 0 elke ~6s, met een korte pauze op elk uiteinde om de
      // eindvorm rustig te kunnen bekijken.
      const cycle = (t % 8) / 8
      const wave = cycle < 0.4 ? cycle / 0.4 : cycle < 0.6 ? 1 : 1 - (cycle - 0.6) / 0.4
      progressRef.current = Math.max(0, Math.min(1, wave))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <main style={{ minHeight: '100vh', position: 'relative' }}>
      <Fleet variant="journey" progressRef={progressRef} />
      <div style={{ position: 'relative', zIndex: 1, padding: '40px', color: '#eaf4ff' }}>
        <h1>journey-spike: boot -&gt; kompas</h1>
        <p>progress loopt vanzelf 0 → 1 → 0. Geen scroll nodig.</p>
      </div>
    </main>
  )
}
