import { Link } from '@/components/link'
import type { ReactNode } from 'react'

/* De regels achter de run. Elke regel is terug te vinden in de publieke repo
   — geen ervan staat alleen in proza. */

const FACTS: { title: string; body: ReactNode }[] = [
  {
    title: 'Waar een agent zich aan houdt',
    body: (
      <>
        Bij tegenspraak wint het hogere document: <strong>constitution.md</strong> (grenzen) &rsaquo;{' '}
        <strong>doelen.md</strong> (richting) &rsaquo; <strong>spec.md</strong> &rsaquo;{' '}
        <strong>AGENTS.md</strong>. Dat hoeft niemand ter plekke te beslissen.
      </>
    ),
  },
  {
    title: 'Van meten naar melden',
    body: (
      <>
        <strong>6,2</strong> geweigerde rechten per run, <strong>18,4%</strong> van de runs tegen het
        beurtenplafond, <strong>30,8%</strong> dubbele builds &mdash; de nulmeting die dit ontwerp
        stuurde. Sinds kort blijft die meting niet in een artifact liggen: komt de ratio geweigerde
        rechten boven de drempel, dan opent de pijplijn er zelf een issue over. Een KPI die niemand
        leest, is geen KPI.
      </>
    ),
  },
  {
    title: 'Een poort die niet mag gokken',
    body: (
      <>
        Bij gelijkspel of nul treffers kiest de poort niet, maar vraagt hij het. Die grensgevallen
        liggen bevroren in de testset &mdash; inclusief eentje die met <strong>2-1</strong> moet
        winnen, want een set die alles met 3-0 wint bewaakt niets.
      </>
    ),
  },
  {
    title: 'De duurste fout is een fout plan',
    body: (
      <>
        Een plan wordt getoetst v&oacute;&oacute;r er gebouwd wordt: staan er concrete stappen in, en
        noemt het z&apos;n eigen verificatie. Anders betaal je een hele build, review en herstelronde
        op het verkeerde fundament.
      </>
    ),
  },
  {
    title: 'Twijfel is een bevinding, geen afwijzing',
    body: (
      <>
        Alles waar de toets niet zeker over kan zijn, komt er als aandachtspunt uit in plaats van als
        blokkade. Een criticus die vals-positief afwijst, leert je de uitkomst te negeren &mdash; en
        dan is de poort erger dan geen poort.
      </>
    ),
  },
  {
    title: 'Eén bron van waarheid',
    body: (
      <>
        Bij een eerdere tweede consument groeiden <strong>vier</strong> uit elkaar gelopen
        kopie&euml;n van dezelfde logica. Dat kan nu niet meer: een consument krijgt een aanroep van
        vijftien regels, nooit een fork.
      </>
    ),
  },
  {
    title: 'Een plattegrond die niet meer kan liegen',
    body: 'De handmatig bijgehouden feature-lijst dreef stil uit de pas met de code. Die is vervangen door een gegenereerd overzicht met een blokkerende controle — documentatie die scheef staat, houdt de build tegen.',
  },
  {
    title: 'Wat een machine kan checken, mag nooit om mij vragen',
    body: 'Anders is het geen poort. Er blijven drie plekken over waar het op mij wacht: de merge, de release, en de escalatie waarin de pijplijn toegeeft dat hij eruit is.',
  },
  {
    title: 'Een noodrem, geen bezuiniging',
    body: 'Elk station heeft een maximum aantal beurten. Loopt een agent vast, dan stopt hij en vraagt om hulp — in plaats van eindeloos door te draaien op een probleem dat hij niet gaat oplossen.',
  },
  {
    title: 'Een pin die pas vastdraait als er iets te beschermen valt',
    body: (
      <>
        Zolang er &eacute;&eacute;n project op de Vloot draaide, wees de gedeelde logica naar{' '}
        <code>@main</code>. Sinds er een tweede, heel anders gevormd project is aangehaakt, staat dat
        pin-beleid ook echt aan: een SHA-pin met een nachtelijke bump-baan die zichzelf bewust
        ongepind laat, want een kapotte pin mag zijn eigen reparatie niet blokkeren.
      </>
    ),
  },
  {
    title: 'Een cache-volume is geen cache zonder de knop ernaartoe',
    body: (
      <>
        Een gemount cache-volume bleek niet automatisch de plek waar de toolchain z&apos;n cache
        zoekt &mdash; zonder de omgevingsvariabele die er expliciet naar wijst, bouwde elke run de
        cache stil opnieuw op. Gemeten valkuil, niet giswerk: pas op te vallen door te kijken of het
        volume ook echt groeide.
      </>
    ),
  },
]

export function FactsAside() {
  return (
    <aside className="kh-facts" id="feiten">
      <h2 className="kh-facts-title">De regels erachter</h2>
      <p className="kh-facts-lead">
        Elke regel hieronder is terug te vinden in de publieke repo &mdash; geen ervan staat alleen
        in proza.
      </p>

      <div className="kh-facts-list">
        {FACTS.map((fact) => (
          <article key={fact.title} className="kh-fact">
            <h3>{fact.title}</h3>
            <p>{fact.body}</p>
          </article>
        ))}
      </div>

      <div className="kh-facts-links">
        <a
          className="kh-link"
          href="https://github.com/KCTHolman/deSchouwVloot"
          target="_blank"
          rel="noopener"
        >
          Bekijk de repo
        </a>
        <Link className="kh-link" href="/werk/#technisch">
          De technische kant
        </Link>
      </div>
    </aside>
  )
}
