import { Link } from '@/components/link'

import { HomeScene } from '@/components/home-scene'
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
        </div>

        {/* Willekeurig één van drie scènes: de vloot (honderden driehoekjes
            die één schouw onder zeil vormen), een heel groot kompas, of een
            hele grote raket die opstijgt en weer landt. Puur decoratief, dus
            buiten de leesvolgorde — zie components/home-scene.tsx. */}
        <HomeScene />
      </div>
    </main>
  )
}
