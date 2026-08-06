'use client'

/* De leeskolom en de scène samen, in één client component: ze delen de
   sleepgordijn-interactie uit lib/use-swipe-reveal.ts via de --kh-swipe
   CSS-variabele die useSwipeReveal() op hun gemeenschappelijke ouder zet
   (zie app/styles/site.css en app/styles/fleet.css voor de bijbehorende
   transform-regels). Losgetrokken uit app/page.tsx, dat zelf een server
   component blijft voor de metadata — useSwipeReveal() heeft React-state
   nodig en kan daar niet in staan.

   De ref zit op <main> zelf, niet op .kh-home-grid daarbinnen: die laatste
   krimpt naar de hoogte van de leestekst (zijn enige child in de gewone
   flow — de scène ligt fixed en telt niet mee), en liet zo een duim die
   onderin het scherm begint te slepen niets raken. <main> rekt via
   .kh-main--home (flex: 1 0 auto) altijd uit tot de volle hoogte tussen
   header en footer, dus daar dekt de sleep-listener het hele scherm. */

import { Link } from '@/components/link'

import { HomeScene } from '@/components/home-scene'
import { useSwipeReveal } from '@/lib/use-swipe-reveal'

const PERSON_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Koen Holman',
  jobTitle: 'Software engineer',
  address: { '@type': 'PostalAddress', addressLocality: 'Tilburg', addressCountry: 'NL' },
  description: 'Software engineer, full stack en AI-native CI/CD.',
  sameAs: ['https://github.com/KCTHolman', 'https://www.linkedin.com/in/koen-holman/'],
  knowsAbout: ['Software engineering', 'CI/CD', 'AI-agents', 'Flutter', 'Full stack development'],
  worksFor: { '@type': 'Organization', name: 'Indicia' },
}

export function HomeHero() {
  const { areaRef } = useSwipeReveal<HTMLElement>()

  return (
    <main ref={areaRef} className="kh-main kh-main--home" id="inhoud">
      {/* De < wordt ontsnapt zodat een string in het schema het script-blok
          nooit kan afsluiten. De inhoud is hier statisch, maar dit is de
          eigenschap die je wilt bewaken, niet de huidige data. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(PERSON_SCHEMA).replace(/</g, '\\u003c'),
        }}
      />

      {/* Alles wat je leest staat links en stopt bij 600px; de vloot ligt als
          schermvullende laag daarachter met de boten in de rechterhelft. Op
          een telefoon staan tekst en scène niet naast elkaar maar over
          elkaar — slepen (vanaf waar dan ook op het scherm) schuift ze uit
          elkaar, in beide richtingen, zie lib/use-swipe-reveal.ts. */}
      <div className="kh-home-grid">
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
            die één schouw onder zeil vormen), een heel groot kompas, een
            traag draaiend tandwiel, of een hele grote raket die opstijgt en
            weer landt. Puur decoratief, dus buiten de leesvolgorde — zie
            components/home-scene.tsx. */}
        <HomeScene />
      </div>
    </main>
  )
}
