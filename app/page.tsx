import { HomeHero } from '@/components/home-hero'
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

      <HomeHero />
    </main>
  )
}
