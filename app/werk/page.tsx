import { Fleet } from '@/components/fleet'
import { ShowcaseViews } from '@/components/showcase/showcase-views'
import { pageMetadata } from '@/lib/metadata'

import '@/app/styles/widget.css'

export const metadata = pageMetadata({
  title: 'AI-projecten — Koen Holman',
  description:
    'deSchouwVloot: een AI-native CI/CD-pijplijn waarin agents het werk doen en een mens op precies drie plekken beslist. Elke bewering is machinaal te controleren.',
  path: '/werk/',
})

export default function WerkPage() {
  return (
    <>
      <Fleet variant="ambient" />
      <main className="kh-main kh-main--werk" id="inhoud">
        <section style={{ padding: '56px 0 0', maxWidth: '680px' }}>
          <p className="kh-eyebrow">Huidige AI-projecten</p>
          <h1 className="kh-page-title">
            Een pijplijn die <span className="kh-accent">zichzelf</span> bewaakt
          </h1>
          <p className="kh-lead">
            CI/CD waarin agents de operators zijn en ik alleen op drie plekken nodig ben. Elke
            bewering erin is machinaal te controleren.
          </p>
        </section>

        <section style={{ padding: '44px 0 0' }}>
          <div className="kh-rule-head">
            <h2 className="kh-section-label">01 &middot; deSchouwVloot</h2>
            <span className="kh-rule" />
            <span className="kh-badge">Publieke repo</span>
          </div>

          <ShowcaseViews />
        </section>
      </main>
    </>
  )
}
