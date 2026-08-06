'use client'

/* De leeskolom en de scène samen, in één client component: ze delen de
   sleepgordijn-interactie uit lib/use-swipe-reveal.ts via de --kh-swipe
   CSS-variabele die useSwipeReveal() op hun gemeenschappelijke ouder zet
   (zie app/styles/site.css en app/styles/fleet.css voor de bijbehorende
   transform-regels). Losgetrokken uit app/page.tsx, dat zelf een server
   component blijft voor de metadata en het JSON-LD-schema — useSwipeReveal()
   heeft React-state nodig en kan daar niet in staan. */

import { Link } from '@/components/link'

import { HomeScene } from '@/components/home-scene'
import { useSwipeReveal } from '@/lib/use-swipe-reveal'

export function HomeHero() {
  const { areaRef } = useSwipeReveal<HTMLDivElement>()

  return (
    // Alles wat je leest staat links en stopt bij 600px; de vloot ligt als
    // schermvullende laag daarachter met de boten in de rechterhelft. Op een
    // telefoon staan tekst en scène niet naast elkaar maar over elkaar —
    // slepen schuift de tekst omlaag en de scène omhoog, zie
    // lib/use-swipe-reveal.ts.
    <div ref={areaRef} className="kh-home-grid">
      <div className="kh-home-copy">
        <section className="kh-hero">
          <p className="kh-eyebrow kh-eyebrow--hero">Software engineer</p>
          <h1 className="kh-hero-title">
            Koen <span className="kh-hero-accent">Holman</span>
          </h1>
          <p className="kh-hero-lead">
            Software engineer uit Tilburg. Bouwt, lost op, en raakt niet uitgeleerd over AI.
          </p>
          <div className="kh-cta-row">
            <Link className="khcta khcta--primary" href="/werk/">
              Huidige AI-projecten &#8594;
            </Link>
            <Link className="khcta khcta--ghost" href="/contact/">
              Zeg hallo
            </Link>
          </div>
        </section>
      </div>

      {/* Willekeurig één van vier scènes: de vloot (honderden driehoekjes
          die één schouw onder zeil vormen), een heel groot kompas, een traag
          draaiend tandwiel, of een hele grote raket die opstijgt en weer
          landt. Puur decoratief, dus buiten de leesvolgorde — zie
          components/home-scene.tsx. */}
      <HomeScene />
    </div>
  )
}
