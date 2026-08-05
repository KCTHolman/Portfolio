'use client'

/* Tijdelijk, wegwerpbaar: alleen om de journey-morph (boot -> kompas ->
   tandwiel -> schild -> sleutel -> raket) visueel te controleren. progress
   loopt vanzelf 0 -> 5 -> 0, geen scroll-koppeling nog. Verwijderen zodra
   alle zes vormen zijn goedgekeurd. */

import { useEffect, useRef, useState } from 'react'

import { Fleet } from '@/components/fleet-lazy'

const STAGE_NAMES = ['boot', 'kompas', 'tandwiel', 'schild', 'sleutel', 'raket']
const STAGE_MS = 3400
const PAUSE_MS = 900

export default function DevJourneyPreview() {
  const progressRef = useRef(0)
  const [label, setLabel] = useState(STAGE_NAMES[0])

  useEffect(() => {
    let frame: number
    const t0 = performance.now()
    const legMs = STAGE_MS + PAUSE_MS
    const totalLegs = STAGE_NAMES.length - 1
    const cycleMs = legMs * totalLegs + PAUSE_MS * 2

    const tick = (now: number) => {
      const t = (now - t0) % cycleMs
      const leg = Math.min(totalLegs - 1, Math.floor(t / legMs))
      const into = t - leg * legMs
      const wave = into < STAGE_MS ? into / STAGE_MS : 1
      progressRef.current = leg + wave
      setLabel(`${STAGE_NAMES[leg]} → ${STAGE_NAMES[Math.min(totalLegs, leg + 1)]} (${wave.toFixed(2)})`)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <main style={{ minHeight: '100vh', position: 'relative' }}>
      <Fleet variant="journey" progressRef={progressRef} />
      <div style={{ position: 'relative', zIndex: 1, padding: '40px', color: '#eaf4ff' }}>
        <h1>journey-spike: alle zes vormen</h1>
        <p>progress loopt vanzelf 0 → 5 → 0. Geen scroll nodig.</p>
        <p style={{ fontFamily: 'monospace' }}>{label}</p>
      </div>
    </main>
  )
}
