import { Link } from '@/components/link'

import { DemoProvider } from '@/components/demo/demo-context'
import { DemoPanel } from '@/components/demo/demo-panel'
import { DemoSheet } from '@/components/demo/demo-sheet'
import { Fleet } from '@/components/fleet'
import { FactsAside } from '@/components/showcase/facts-aside'
import { RunLogSlot } from '@/components/showcase/run-log-slot'
import { pageMetadata } from '@/lib/metadata'

import '@/app/styles/widget.css'
import '@/app/styles/demo.css'

export const metadata = pageMetadata({
  title: 'Logboek — één run door de pijplijn | Koen Holman',
  description:
    'Eén echt idee, gevolgd door de hele AI-native CI/CD-pijplijn van deSchouwVloot. Van inbox tot live release, inclusief de drie momenten waarop een mens beslist.',
  path: '/werk/logboek/',
})

export default function LogboekPage() {
  return (
    <DemoProvider>
      <Fleet variant="ambient" />

      <main className="kh-main kh-main--logboek" id="inhoud">
        <section>
          <Link className="kh-back" href="/werk/">
            &larr; Terug naar de projecten
          </Link>
          <p className="kh-eyebrow">deSchouwVloot &middot; verhalend</p>
          <h1 className="kh-page-title">
            Van idee tot <span className="kh-accent">live</span>
          </h1>
          <p className="kh-lead">
            E&eacute;n echt idee, gevolgd door de hele pijplijn. Je ziet onderweg waar het meedenkt,
            en op welke drie plekken het op mij wacht.
          </p>
        </section>

        <div className="kh-logboek">
          <div className="kh-logboek-main">
            <RunLogSlot />
          </div>

          {/* De slot heeft geen eigen hoogte, dus de rij is zo hoog als de run
              en het paneel erin komt daar precies mee overeen. */}
          <div className="kh-facts-slot">
            <FactsAside />
          </div>
        </div>

        <DemoPanel />
      </main>

      {/* Buiten <main>: die heeft z-index 1 en dus een eigen stacking context,
          waardoor het sheet er nooit bovenuit kan komen. */}
      <DemoSheet />
    </DemoProvider>
  )
}
