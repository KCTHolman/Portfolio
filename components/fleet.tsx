'use client'

/* ==========================================================================
   De vloot — het beeldmerk van deze site.

   Zes standen:
     hero          de volle vloot, schermvullend achter de homepage
     ambient       een handvol verre boten achter de inhoud van een subpagina
     journey       één vorm, vast rechts in beeld, die van gedaante wisselt op
                   basis van scroll-voortgang (zie /werk/)
     showcase      een hele vloot rechtsboven die op een eigen klok (geen
                   scroll, geen hover) wisselt tussen vloot, een lading
                   raketjes en een stelsel tandwielen (zie /koen-holman/)
     home-compass  homepage-alternatief voor hero: één heel groot, stilstaand
                   kompas met een rustig zwaaiende naald
     home-rocket   homepage-alternatief voor hero: één hele grote raket die
                   op een trage, eigen klok opstijgt, boven hangt en weer
                   landt — een lus, geen eenmalig vertrek zoals hero's eigen
                   kleine lanceringen

   Welke van de drie homepage-standen (hero/home-compass/home-rocket) een
   bezoek te zien krijgt, loot components/home-scene.tsx bij het laden.

   De kleuren komen uit dezelfde --t1..--t3 die de aurora op <html> schrijft,
   dus de vloot verkleurt mee met de wash erachter in plaats van ernaast te
   staan.

   Het canvaswerk zelf staat in lib/use-fleet-scene.ts; hier blijft alleen het
   mountpunt over.
   ========================================================================== */

import { useCallback, useRef, useState, type RefObject } from 'react'

import { useAurora } from '@/components/aurora/aurora-provider'
import { useFleetScene, type FleetVariant } from '@/lib/use-fleet-scene'
import { useMediaQuery, useNarrowScreen, usePrefersReducedMotion } from '@/lib/use-media-query'

export type { FleetVariant }

/** journey heeft een progressRef nodig om te weten welke vorm te tonen, en
 *  optioneel een githubHoverRef om naar het raket-stadium te mengen en te
 *  lanceren; hero/ambient/showcase hebben geen van beide en mogen ze dus ook
 *  niet meekrijgen — showcase draait op zijn eigen klok in useFleetScene. */
type FleetProps =
  | { variant: 'hero' | 'ambient' | 'showcase' | 'home-compass' | 'home-rocket' }
  | { variant: 'journey'; progressRef: RefObject<number>; githubHoverRef?: RefObject<boolean> }

export function Fleet(props: FleetProps) {
  const { variant } = props
  const mountRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sailing, setSailing] = useState(false)

  const reduceMotion = usePrefersReducedMotion()
  const narrowScreen = useNarrowScreen()
  const coarsePointer = useMediaQuery('(pointer: coarse)')
  /* Stuurt de vlootformatie op hero/ambient; journey negeert 'm. Altijd
     beschikbaar — AuroraProvider omvat de hele boom, dus deze hook is hier
     nooit onveilig, ook al is de preset voor journey niet van belang. */
  const { activePreset } = useAurora()

  const onSailing = useCallback(() => setSailing(true), [])

  useFleetScene({
    mountRef,
    canvasRef,
    variant,
    /* Stilstaand beeld in plaats van een lopende animatie, alleen als dat
       gevraagd is via reduced motion. De statische build en de lazy-loaded
       vloot hebben de kosten op een telefoon al teruggebracht, dus die hoeft
       hier niet apart bevroren te worden. */
    frozen: reduceMotion,
    narrowScreen,
    coarsePointer,
    onSailing,
    progressRef: variant === 'journey' ? props.progressRef : undefined,
    githubHoverRef: variant === 'journey' ? props.githubHoverRef : undefined,
    presetIndex: activePreset,
  })

  const className = [
    variant === 'hero' || variant === 'home-compass' || variant === 'home-rocket'
      ? 'kh-home-visual'
      : variant === 'journey'
        ? 'kh-journey'
        : variant === 'showcase'
          ? 'kh-showcase'
          : 'kh-ambient',
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
