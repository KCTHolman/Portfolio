import type { CSSProperties } from 'react'
import { Link } from '@/components/link'

import { Fleet } from '@/components/fleet'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Koen Holman — Software engineer, full stack & AI',
  description:
    'Koen Holman, software engineer uit Tilburg. Full stack development en AI-native CI/CD: pijplijnen waarin agents het werk doen en een mens op drie plekken beslist.',
  path: '/',
})

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

const SCHOUWVLOOT_FACTS = [
  'Zestien workflows, geen enkele die zichzelf kan starten.',
  'Bij twijfel gokt de poort niet, maar vraagt hij het.',
  'Een plan wordt getoetst vóór er iets gebouwd wordt.',
  'Zes controles op elke wijziging, twee ervan blokkerend.',
  'Dubbele builds zaten op 30,8% — nu structureel onmogelijk.',
  'Documentatie die scheef staat, houdt de build tegen.',
  'Logica leeft precies één keer, nooit als fork.',
  'Drie plekken waar het op mij wacht. Verder niets.',
]

const BIOHACKOS_FACTS = [
  'Een logsysteem voor gewicht, sport, boodschappen en voeding.',
  'RAG als experiment: antwoorden ophalen uit eigen logs.',
  'Nog in opbouw — meer volgt zodra het staat.',
]

/** Cyclet op CSS alleen: elk item heeft z'n eigen plak van één gedeelde
 *  animatie. Reduced motion valt terug op de eerste regel, stilstaand. */
function Ticker({ label, items, className }: { label: string; items: string[]; className?: string }) {
  return (
    <p className={`kh-ticker${className ? ` ${className}` : ''}`} aria-label={label}>
      <span className="kh-ticker-dot" aria-hidden="true" />
      <span className="kh-ticker-items">
        {items.map((item, i) => (
          <span key={item} className="kh-ticker-item" style={{ '--i': i } as CSSProperties}>
            {item}
          </span>
        ))}
      </span>
    </p>
  )
}

export default function HomePage() {
  return (
    <main className="kh-main kh-main--home" id="inhoud">
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
          schermvullende laag daarachter met de boten in de rechterhelft. */}
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

          <section className="kh-now">
            <h2 className="kh-section-label">Waar ik nu aan bouw</h2>

            {/* Een paneel, geen link: de twee diepe links zitten erin, en een
                anchor kan niet in een anchor. De titel draagt de link naar de
                projectpagina zelf. */}
            <div className="kh-panel kh-now-card">
              <span className="kh-card-kicker">Project 01 &middot; huidig</span>
              <Link className="kh-card-title" href="/werk/">
                de Schouw<span className="kh-accent">vloot</span>
              </Link>
              <span className="kh-card-body">
                Een AI-native CI/CD-pijplijn waarin agents het werk doen en een mens op precies drie
                plekken verschijnt. Publiek te lezen. (showcase variant)
              </span>

              <Ticker label="Feiten over deSchouwVloot" items={SCHOUWVLOOT_FACTS} />

              <div className="kh-link-row kh-project-links">
                <Link className="kh-link" href="/werk/logboek/">
                  Verhalend &middot; niet-technische uitleg
                </Link>
                <Link className="kh-link" href="/werk/#technisch">
                  Technisch &middot; wat het soepel houdt
                </Link>
                <Link className="kh-pill" href="/werk/readme/" aria-label="Lees de README van deSchouwVloot">
                  README &rarr;
                </Link>
              </div>
            </div>

            <div className="kh-panel kh-soon-card">
              <span className="kh-card-kicker">Project 02 &middot; in ontwikkeling</span>
              <span className="kh-card-title kh-card-title--static">
                Biohack<span className="kh-accent">OS</span>
              </span>
              <span className="kh-card-body">
                Mijn eigen logsysteem voor gewicht, sportresultaten, boodschappen en voedselinname.
                Hier experimenteer ik met RAG, zodat de agent antwoorden kan ophalen uit die eigen
                logs in plaats van alleen op getraind te vertrouwen.
              </span>

              <Ticker
                label="Feiten over BiohackOS"
                items={BIOHACKOS_FACTS}
                className="kh-ticker--3"
              />
            </div>
          </section>
        </div>

        {/* Honderden driehoekjes die één schouw onder zeil vormen, met kleinere
            boten eromheen. Puur decoratief, dus buiten de leesvolgorde. */}
        <Fleet variant="hero" />
      </div>
    </main>
  )
}
