'use client'

/* ==========================================================================
   De vloot — het beeldmerk van deze site.

   Zeven standen:
     hero          de volle vloot, schermvullend achter de homepage
     ambient       een handvol verre boten achter de inhoud van een subpagina
     journey       één vorm, vast rechts in beeld, die van gedaante wisselt op
                   basis van scroll-voortgang (zie /werk/)
     showcase      een hele vloot rechtsboven die op een eigen klok (geen
                   scroll, geen hover) wisselt tussen vloot, een lading
                   raketjes en een stelsel tandwielen (zie /koen-holman/)
     home-compass  homepage-alternatief voor hero: één heel groot, stilstaand
                   kompas met een rustig zwaaiende naald
     home-gear     homepage-alternatief voor hero: één heel groot tandwiel dat
                   traag en doorlopend draait
     home-rocket   homepage-alternatief voor hero: één hele grote raket die
                   op een eigen klok echt vertrekt — opstijgt en helemaal
                   van beeld verdwijnt, een paar tellen leeg blijft, en dan
                   uit willekeurig verschenen driehoekjes weer opnieuw
                   samenkomt tot raket

   Welke van de vier homepage-standen (hero/home-compass/home-gear/
   home-rocket) een bezoek te zien krijgt, loot components/home-scene.tsx bij
   het laden. Op een telefoon is er geen leeskolom naast de vorm — de drie
   home-*-standen mogen daar groter en gecentreerd achter de tekst liggen in
   plaats van ernaast (zie de anker- en share-overrides in
   lib/use-fleet-scene.ts, en de .kh-home-solo-opacity in app/styles/
   fleet.css).

   De kleuren komen uit dezelfde --t1..--t3 die de aurora op <html> schrijft,
   dus de vloot verkleurt mee met de wash erachter in plaats van ernaast te
   staan.

   Het canvaswerk zelf staat in lib/use-fleet-scene.ts; hier blijft alleen het
   mountpunt over.
   ========================================================================== */

import { useCallback, useRef, useState, type RefObject } from 'react'

import { useAurora } from '@/components/aurora/aurora-provider'
import { useFleetScene, type FleetVariant } from '@/lib/use-fleet-scene'
import { useNarrowScreen, usePrefersReducedMotion } from '@/lib/use-media-query'

export type { FleetVariant }

/** journey heeft een progressRef nodig om te weten welke vorm te tonen, en
 *  optioneel een githubHoverRef om naar het raket-stadium te mengen en te
 *  lanceren; hero/ambient/showcase hebben geen van beide en mogen ze dus ook
 *  niet meekrijgen — showcase draait op zijn eigen klok in useFleetScene. */
type FleetProps =
  | { variant: 'hero' | 'ambient' | 'showcase' | 'home-compass' | 'home-gear' | 'home-rocket' }
  | { variant: 'journey'; progressRef: RefObject<number>; githubHoverRef?: RefObject<boolean> }

export function Fleet(props: FleetProps) {
  const { variant } = props
  const mountRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sailing, setSailing] = useState(false)

  const reduceMotion = usePrefersReducedMotion()
  const narrowScreen = useNarrowScreen()
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
    onSailing,
    progressRef: variant === 'journey' ? props.progressRef : undefined,
    githubHoverRef: variant === 'journey' ? props.githubHoverRef : undefined,
    presetIndex: activePreset,
  })

  const isHomeSolo = variant === 'home-compass' || variant === 'home-gear' || variant === 'home-rocket'

  const className = [
    variant === 'hero' || isHomeSolo
      ? 'kh-home-visual'
      : variant === 'journey'
        ? 'kh-journey'
        : variant === 'showcase'
          ? 'kh-showcase'
          : 'kh-ambient',
    // Los modifier-klasje, alleen voor CSS: op smalle schermen mogen deze
    // drie een stuk zichtbaarder zijn dan de gewone hero-vloot, zie
    // app/styles/fleet.css.
    isHomeSolo ? 'kh-home-solo' : '',
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
