'use client'

/* ==========================================================================
   De vloot — het beeldmerk van deze site.

   Twee standen:
     hero     de volle vloot, schermvullend achter de homepage
     ambient  een handvol verre boten achter de inhoud van een subpagina

   De kleuren komen uit dezelfde --t1..--t3 die de aurora op <html> schrijft,
   dus de vloot verkleurt mee met de wash erachter in plaats van ernaast te
   staan.

   Het canvaswerk zelf staat in lib/use-fleet-scene.ts; hier blijft alleen het
   mountpunt over.
   ========================================================================== */

import { useCallback, useRef, useState } from 'react'

import { useFleetScene, type FleetVariant } from '@/lib/use-fleet-scene'
import { useMediaQuery, useNarrowScreen, usePrefersReducedMotion } from '@/lib/use-media-query'

export type { FleetVariant }

export function Fleet({ variant }: { variant: FleetVariant }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sailing, setSailing] = useState(false)

  const reduceMotion = usePrefersReducedMotion()
  const narrowScreen = useNarrowScreen()
  const coarsePointer = useMediaQuery('(pointer: coarse)')

  const onSailing = useCallback(() => setSailing(true), [])

  useFleetScene({
    mountRef,
    canvasRef,
    variant,
    /* Stilstaand beeld in plaats van een lopende animatie: bij reduced motion
       omdat het gevraagd is, op een telefoon omdat een canvas dat elke frame
       honderden paden trekt daar meer kost dan het oplevert. */
    frozen: reduceMotion || narrowScreen,
    narrowScreen,
    coarsePointer,
    onSailing,
  })

  const className = [
    variant === 'hero' ? 'kh-home-visual' : 'kh-ambient',
    sailing ? 'is-varend' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={mountRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="kh-fleet-canvas" aria-hidden="true" />
    </div>
  )
}
