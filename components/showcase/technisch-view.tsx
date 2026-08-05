import { Link } from '@/components/link'

import { ShowcaseFoot } from './showcase-foot'
import { CHECKS, METRICS, ROADMAP, WORKFLOWS_URL } from './technisch-data'

/* De machinerie eronder: geen onderdeel vertrouwt blind op het vorige. */

export function TechnischView({ onBack }: { onBack: () => void }) {
  return (
    <div className="dsv-view dsv-view--technisch">
      <header className="dsv-header">
        <div className="dsv-intro dsv-intro--wide">
          <button type="button" className="dsv-back" onClick={onBack}>
            &larr; Kies weergave
          </button>
          <p className="dsv-eyebrow">
            <span className="dsv-eyebrow-dot" aria-hidden="true" />
            Showcase &middot; CI/CD-infrastructuur &middot; Technisch
          </p>
          <h3 className="dsv-title">
            Wat dit <em>soepel</em> houdt
          </h3>
          <p className="dsv-lead">
            Geen onderdeel vertrouwt blind op het vorige. Dit is de laag die drift, races en stille
            afwijkingen opvangt voordat jij ooit een melding ziet. Elke naam hieronder is een echt
            bestand of principe uit de publieke repo, niet gladgestreken voor de show.
          </p>
        </div>

        <ul className="dsv-stats">
          <li className="dsv-stat">
            <span className="dsv-stat-n">6</span>
            <span className="dsv-stat-l">consistency-checks</span>
          </li>
          <li className="dsv-stat dsv-stat--gate">
            <span className="dsv-stat-n">16</span>
            <span className="dsv-stat-l">workflows, nul triggers</span>
            <p className="dsv-entry-tech">
              <span className="dsv-tech-label">backend</span>
              Wat er live staat is te herleiden: elke fase heeft z&apos;n eigen PR, z&apos;n eigen
              groene checks en &eacute;&eacute;n approval. De keten van issue naar release is
              machinaal na te lopen.
            </p>
            <p className="dsv-entry-fail">
              <span className="dsv-fail-label">als het misgaat</span>
              Precies dat is het verschil tussen een pijplijn die soepel liep en een die dat leek te
              doen: bij een probleem kun je terugzien welke poort open stond en wat er toen groen
              was.
            </p>
          </li>
        </ul>
      </header>

      <div className="dsv-tech">
        <div className="dsv-runner">
          <p className="dsv-runner-eyebrow">
            <span className="dsv-eyebrow-dot" aria-hidden="true" />
            runner &middot; actief
          </p>
          <div>
            <div className="dsv-runner-title">E&eacute;n Ubuntu Server, self-hosted</div>
            <p className="dsv-runner-body">
              Geen cloud-runner: &eacute;&eacute;n eigen machine, altijd aan, draagt de self-hosted
              lanes &mdash; <code>agent</code> in een ephemeral container zonder docker-daemon, plus{' '}
              <code>heavy</code> en <code>light</code>. Diezelfde machine voert de agent-CLI uit en
              praat via een OAuth-verbinding met het model dat vandaag alle planning en code voor
              zijn rekening neemt.
            </p>
          </div>
          <div className="dsv-runner-stats">
            <span className="dsv-chip">24/7 aan</span>
            <span className="dsv-chip">0 open inbound poorten</span>
            <span className="dsv-chip">auth via OAuth, geen API-key in repo</span>
          </div>
        </div>

        <div>
          <div className="dsv-tech-label">
            Gemeten, niet verzonnen &mdash; nulmeting v&oacute;&oacute;r dit ontwerp
          </div>
          <div className="dsv-metrics">
            {METRICS.map((metric) => (
              <div key={metric.label} className="dsv-metric">
                <div className="dsv-metric-n">{metric.n}</div>
                <div className="dsv-metric-l">{metric.label}</div>
                <div className="dsv-metric-fix">{metric.fix}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="dsv-tech-head">
            <div className="dsv-tech-label">6 controles die elke run bewaken</div>
            <a
              className="kh-link dsv-tech-link"
              href={WORKFLOWS_URL}
              target="_blank"
              rel="noopener"
            >
              Alle 16 workflows &rarr;
            </a>
          </div>
          <div className="dsv-checks">
            {CHECKS.map((check) => (
              <div key={check.tag} className="dsv-check">
                <span className="dsv-check-tag">{check.tag}</span>
                <span className="dsv-check-title">{check.title}</span>
                <p className="dsv-check-body">{check.body}</p>
                <a
                  className="kh-link dsv-check-link"
                  href={check.href}
                  target="_blank"
                  rel="noopener"
                >
                  Bekijk in repo &rarr;
                </a>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="dsv-tech-label">Vandaag &middot; morgen</div>
          <div className="dsv-roadmap">
            <div className="dsv-road dsv-road--now">
              <span className="dsv-road-tag">{ROADMAP[0].tag}</span>
              <div className="dsv-road-title">{ROADMAP[0].title}</div>
              <p className="dsv-road-body">{ROADMAP[0].body}</p>
            </div>
            <div className="dsv-road-arrow" aria-hidden="true">
              &rarr;
            </div>
            <div className="dsv-road dsv-road--next">
              <span className="dsv-road-tag">{ROADMAP[1].tag}</span>
              <div className="dsv-road-title">{ROADMAP[1].title}</div>
              <p className="dsv-road-body">{ROADMAP[1].body}</p>
            </div>
          </div>
        </div>

        {/* Onderaan, niet bovenaan: wie hier binnenkwam koos net bewust de
            samenvatting boven de bron, en dan is een luide "begin hier" boven
            de tekst een tweede keer dezelfde vraag stellen. Ná het overzicht
            is het een aanbod om na te trekken. */}
        <Link className="dsv-readme" href="/werk/readme/">
          <div className="dsv-readme-main">
            <p className="dsv-readme-eyebrow">
              <span className="dsv-eyebrow-dot" aria-hidden="true" />
              de bron &middot; README.md
            </p>
            <span className="dsv-readme-title">Dit was mijn samenvatting</span>
            <p className="dsv-readme-body">
              De repo zegt het in eigen woorden: de volledige <code>README.md</code>, hier
              gerenderd. De drie ontwerpidee&euml;n, het consumer-contract van vijftien regels, en
              waarom geen enkele van de zestien workflows een eigen trigger heeft. Alle verwijzingen
              erin linken door naar het echte bestand op GitHub.
            </p>
          </div>
          <span className="dsv-readme-cta">Lees de README &rarr;</span>
        </Link>
      </div>

      <ShowcaseFoot
        note={<>Architectuur van de pijplijn &middot; publieke, gecureerde repo</>}
      />
    </div>
  )
}
