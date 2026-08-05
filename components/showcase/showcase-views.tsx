'use client'

/* Twee weergaven achter één keuzescherm. Alle tekst staat in de JSX, dus de
   pagina leest ook zonder JS — dsv-nojs toont dan beide weergaven onder
   elkaar in plaats van de knoppen te tonen die niets zouden doen. */

import { useCallback, useEffect, useState } from 'react'

import { GateView } from './gate-view'
import { ShowcaseStars } from './showcase-stars'
import { TechnischView } from './technisch-view'

type View = 'gate' | 'technisch'

/** #technisch opent die weergave meteen, zodat de homepage een bezoeker naar
 *  de kant kan sturen waar het om gaat. */
function viewFromHash(): View {
  return window.location.hash.slice(1) === 'technisch' ? 'technisch' : 'gate'
}

export function ShowcaseViews() {
  const [view, setView] = useState<View>('gate')
  const [interactive, setInteractive] = useState(false)

  useEffect(() => {
    setInteractive(true)
    setView(viewFromHash())

    const onHashChange = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const goTo = useCallback((next: View) => {
    setView(next)
    /* replaceState, geen hash-toewijzing: van weergave wisselen is geen
       pagina waar de terugknop doorheen zou moeten lopen. */
    window.history.replaceState(
      null,
      '',
      next === 'gate' ? window.location.pathname + window.location.search : `#${next}`,
    )
  }, [])

  const goToTechnisch = useCallback(() => goTo('technisch'), [goTo])
  const goToGate = useCallback(() => goTo('gate'), [goTo])

  return (
    <section
      className={interactive ? 'dsv' : 'dsv dsv-nojs'}
      data-view={view}
      aria-label="deSchouwVloot showcase"
    >
      <div className="dsv-glow" aria-hidden="true" />
      <div className="dsv-glow dsv-glow--b" aria-hidden="true" />
      <ShowcaseStars />

      <GateView onGoToTechnisch={goToTechnisch} />
      <TechnischView onBack={goToGate} />
    </section>
  )
}
