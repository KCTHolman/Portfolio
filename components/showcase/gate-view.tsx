import { Link } from '@/components/link'

import { ShowcaseFoot } from './showcase-foot'

/* Het keuzescherm. Drie ingangen: het verhaal, de machinerie, of het bestand
   zelf. De derde kaart is geen derde invalshoek maar de bron onder de andere
   twee — geen samenvatting van mij, maar wat de repo zelf zegt. Daarom een
   eigen kaart en niet weggestopt achter de technische kant. */

export function GateView({ onGoToTechnisch }: { onGoToTechnisch: () => void }) {
  return (
    <div className="dsv-view dsv-view--gate">
      <header className="dsv-header">
        <div className="dsv-intro">
          <p className="dsv-eyebrow">
            <span className="dsv-eyebrow-dot" aria-hidden="true" />
            Showcase &middot; CI/CD-infrastructuur
          </p>
          <h3 className="dsv-title">
            Kies je <em>ingang</em>
          </h3>
          <p className="dsv-lead">
            Dezelfde pijplijn, drie invalshoeken: het verhaal, de machinerie, of het bestand zelf.
            Wisselen kan altijd.
          </p>
        </div>
      </header>

      <div className="dsv-choices">
        <Link className="dsv-choice" href="/werk/logboek/">
          <span className="dsv-choice-mark dsv-choice-mark--quote" aria-hidden="true">
            &rdquo;
          </span>
          <span className="dsv-choice-kicker">01 &middot; Voor het gevoel</span>
          <span className="dsv-choice-title">Verhalend</span>
          <span className="dsv-choice-body">
            E&eacute;n run, op de voet gevolgd. Van los idee tot live release &mdash; en de momenten
            waarop een mens moest klikken.
          </span>
          <span className="dsv-tags">
            <span className="dsv-tag">&eacute;&eacute;n run</span>
            <span className="dsv-tag">logboek</span>
          </span>
          <span className="dsv-choice-cta">Bekijk &rarr;</span>
        </Link>

        <button type="button" className="dsv-choice" onClick={onGoToTechnisch}>
          <span className="dsv-choice-mark dsv-choice-mark--braces" aria-hidden="true">
            {'{ }'}
          </span>
          <span className="dsv-choice-kicker">02 &middot; Voor het snappen</span>
          <span className="dsv-choice-title">Technisch</span>
          <span className="dsv-choice-body">
            Wat er onder de motorkap voorkomt dat dit soepel blijft lopen &mdash; SHA-pinning,
            drift-detectie, en de machine die het draait.
          </span>
          <span className="dsv-tags">
            <span className="dsv-tag">consistency-checks</span>
            <span className="dsv-tag">self-hosted</span>
          </span>
          <span className="dsv-choice-cta">Bekijk &rarr;</span>
        </button>

        <Link className="dsv-choice" href="/werk/readme/">
          <span className="dsv-choice-mark dsv-choice-mark--hash" aria-hidden="true">
            #
          </span>
          <span className="dsv-choice-kicker">03 &middot; Voor de bron</span>
          <span className="dsv-choice-title">README</span>
          <span className="dsv-choice-body">
            Het bestand zelf, woord voor woord. De drie ontwerpidee&euml;n, het contract van vijftien
            regels, en waarom geen enkele workflow een eigen trigger heeft.
          </span>
          <span className="dsv-tags">
            <span className="dsv-tag">README.md</span>
            <span className="dsv-tag">links naar de repo</span>
          </span>
          <span className="dsv-choice-cta">Lees &rarr;</span>
        </Link>
      </div>

      <ShowcaseFoot note={<>Drie ingangen, dezelfde pijplijn &middot; publieke, gecureerde repo</>} />
    </div>
  )
}
