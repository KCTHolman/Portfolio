import { Link } from '@/components/link'
import type { CSSProperties, ReactNode } from 'react'

import { Fleet } from '@/components/fleet'
import { CodeSnippet } from '@/components/readme/code-snippet'
import { ReadmeOutline } from '@/components/readme/readme-outline'
import { pageMetadata } from '@/lib/metadata'
import { OUTLINE } from '@/lib/readme-outline'

import '@/app/styles/readme.css'

export const metadata = pageMetadata({
  title: 'README van deSchouwVloot — Koen Holman',
  description:
    'De README van deSchouwVloot, woord voor woord gerenderd. De drie ontwerpideeën, het consumer-contract van vijftien regels, en waarom geen enkele van de zestien workflows een eigen trigger heeft.',
  path: '/werk/readme/',
})

const REPO = 'https://github.com/KCTHolman/deSchouwVloot'
const BLOB = `${REPO}/blob/main`

/** Elke link in de body opent GitHub — zie de verantwoording bovenaan. */
function Gh({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener">
      {children}
    </a>
  )
}

function Heading({
  level,
  index,
  children,
}: {
  level: 2 | 3 | 4
  index: number
  children: ReactNode
}) {
  const { id } = OUTLINE[index]
  const Tag = `h${level}` as 'h2' | 'h3' | 'h4'
  return (
    <Tag id={id}>
      <a className="gh-anchor" href={`#${id}`} aria-label="Link naar deze kop">
        #
      </a>
      {children}
    </Tag>
  )
}

const OMISSIONS = [
  {
    key: 'host-diagnostiek',
    what: 'De host-diagnostiekworkflow',
    why: (
      <>
        Bracht in kaart w&aacute;&aacute;r elk credential op de runner-host stond (paden en
        permissies, nooit inhoud). Legitiem gereedschap voor de eigenaar, maar publiek een
        kant-en-klare doelwitlijst.
      </>
    ),
  },
  {
    key: 'hostcijfers',
    what: 'Concrete hostcijfers — RAM, schijf, co-hostende diensten',
    why: (
      <>
        Horen bij &eacute;&eacute;n specifieke machine; zeggen niets over het ontwerp en w&eacute;l
        iets over waar die machine zwak staat.
      </>
    ),
  },
  {
    key: 'isolatiestatus',
    what: 'Isolatiestatus per lane',
    why: (
      <>
        Vermeldde per lane of hij al ge&iuml;soleerd was of nog niet. Dat is een tijdgebonden
        statusregel, geen ontwerpkenmerk.
      </>
    ),
  },
  {
    key: 'callers',
    what: 'De twee callers met echte triggers',
    why: (
      <>
        <code>pull_request</code>/<code>schedule</code>-callers. Hun inhoud is het lezen waard, hun
        trigger niet.
      </>
    ),
  },
  {
    key: 'domeintrefwoorden',
    what: (
      <>
        Domeintrefwoorden van de productconsument in <code>routing.yml</code>
      </>
    ),
    why: (
      <>
        Vervangen door neutrale voorbeelden. Dit is de &eacute;nige plek waar projectkennis in de
        poort zit &mdash; dat is meteen het ontwerpargument: de rest van de machinerie is domeinvrij
        en dus deelbaar.
      </>
    ),
  },
  {
    key: 'draaiboek',
    what: 'Interne draaiboek-verwijzingen',
    why: (
      <>
        Wezen naar documenten in priv&eacute;repo&apos;s; als link waardeloos, als bestandsnaam soms
        verklappend.
      </>
    ),
  },
]

export default function ReadmePage() {
  return (
    <>
      <Fleet variant="ambient" />
      <main className="kh-main kh-main--readme" id="inhoud">
        <section className="kh-readme-head">
          <Link className="kh-back" href="/werk/#technisch">
            &larr; Terug naar het technisch overzicht
          </Link>
          <p className="kh-eyebrow">deSchouwVloot &middot; technisch overzicht</p>
          <h1 className="kh-page-title">
            De <span className="kh-accent">README</span>, ongefilterd
          </h1>
          <p className="kh-lead">
            Het overzicht op{' '}
            <Link className="kh-link" href="/werk/#technisch">
              /werk
            </Link>{' '}
            is mijn samenvatting. Dit is de bron ervan: de README zoals hij in de repo staat, woord
            voor woord. Begin hier als je wilt beoordelen of het ontwerp klopt &mdash; de rest van de
            site is een gloss op dit bestand.
          </p>
        </section>

        {/* De kop van een repo op GitHub: eigenaar, naam, zichtbaarheid, talen.
            Hier heeft het een tweede functie — het zegt meteen dat alles
            hieronder ergens echt staat, publiek, met een commit-historie
            ernaast. */}
        <div className="gh-repo">
          <p className="gh-repo-line">
            <svg className="gh-repo-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
            </svg>
            <span className="gh-repo-path">
              KCTHolman&nbsp;/&nbsp;<Gh href={REPO}>deSchouwVloot</Gh>
            </span>
            <span className="gh-pill">Public</span>
          </p>
          <p className="gh-repo-desc">
            Gedeelde gitflow- en runner-infrastructuur voor meerdere projecten. Geen productcode,
            geen domeinlogica, geen data &mdash; alleen de machinerie zelf.
          </p>
          <div className="gh-repo-meta">
            <span className="gh-lang">
              <span className="gh-lang-dot" style={{ '--c': '#cb171e' } as CSSProperties} aria-hidden="true" />
              YAML
            </span>
            <span className="gh-lang">
              <span className="gh-lang-dot" style={{ '--c': '#89e051' } as CSSProperties} aria-hidden="true" />
              Shell
            </span>
            <span className="gh-lang">
              <span className="gh-lang-dot" style={{ '--c': '#3572a5' } as CSSProperties} aria-hidden="true" />
              Python
            </span>
            <span>16 workflows &middot; 0 triggers</span>
          </div>
        </div>

        <article className="gh-file">
          <div className="gh-file-head">
            <span className="gh-file-name">
              <svg
                className="gh-file-icon"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
              </svg>
              README.md
              <span className="gh-ref">main</span>
            </span>
            <span className="gh-file-acts">
              <Gh
                className="gh-act"
                href="https://raw.githubusercontent.com/KCTHolman/deSchouwVloot/main/README.md"
              >
                Raw &#8599;
              </Gh>
              <Gh className="gh-act gh-act--primary" href={`${REPO}#readme`}>
                Bekijk op GitHub &#8599;
              </Gh>
            </span>
          </div>

          {/* Verantwoording, niet decoratie: de tekst is onveranderd, maar de
              links waren relatief en zijn hier absoluut gemaakt. Dat verzwijgen
              zou van een letterlijke kopie een stille bewerking maken. */}
          <p className="gh-note">
            <span aria-hidden="true">&#9432;</span>
            <span>
              De tekst is letterlijk die van <code>README.md</code>. Alleen de links zijn omgezet:
              elk relatief pad wijst hier naar hetzelfde bestand in de publieke repo. Een{' '}
              <span aria-hidden="true">&#8599;</span> achter een link betekent dus altijd: dit opent
              GitHub.
            </span>
          </p>

          <div className="gh-body">
            <div className="gh-md">
              <Heading level={2} index={0}>
                deSchouwVloot &mdash; een AI-native CI/CD-pijplijn, als showcase
              </Heading>

              <p>
                Gedeelde gitflow- en runner-infrastructuur voor meerdere projecten: herbruikbare
                workflows, een routerende intake-poort, en een set machinaal toetsbare invarianten
                die de pijplijn zichzelf laten bewaken. Geen productcode, geen domeinlogica, geen
                data &mdash; alleen de machinerie zelf.
              </p>

              <p>
                Hierna kortweg <strong>de Vloot</strong>.
              </p>

              <p>
                Dit is een <strong>gecureerde, publieke kopie</strong> van een
                priv&eacute;-productierepo. Wat hier staat draait echt; wat eruit is gehaald staat
                hieronder expliciet benoemd.
              </p>

              <blockquote>
                <p>
                  <strong>Over de naamgeving.</strong> Bestandsnamen en scripts dragen nog het{' '}
                  <code>fleet</code>-voorvoegsel &mdash; <code>.fleet.yml</code>,{' '}
                  <code>fleet-doctor.sh</code>, het <code>fleet-task</code>-label. Dat is bewust: dat
                  zijn echte identifiers waar code en tests aan hangen, geen proza. De naam in de
                  tekst is veranderd, de contracten niet.
                </p>
              </blockquote>

              <hr />

              <Heading level={3} index={1}>
                Waarom dit interessant is
              </Heading>

              <p>
                De meeste CI-opstellingen groeien organisch: een workflow hier, een cron daar, en na
                een jaar weet niemand meer welke poort wat bewaakt. Dit is een poging tot het
                tegenovergestelde &mdash; een pijplijn die is <strong>ontworpen</strong>, met drie
                idee&euml;n als ruggengraat:
              </p>

              <p>
                <strong>1. Elke poort is machine-checkbaar, of het is geen poort.</strong> Menselijke
                aandacht is de schaarste. In het hele systeem zitten precies drie plekken waar een
                mens verschijnt: feature-approval, release-approval, en escalatie bij{' '}
                <code>needs-human</code>. Al het andere is doorstroom. Zie{' '}
                <Gh href={`${BLOB}/docs/architectuur.md`}>docs/architectuur.md &sect;3</Gh>.
              </p>

              <p>
                <strong>
                  2. Configuratie die gedrag stuurt, is code &mdash; dus krijgt het tests.
                </strong>{' '}
                De intake-poort routeert issues naar het juiste project op basis van een
                trefwoordtabel. Voeg &eacute;&eacute;n te breed trefwoord toe en de unit-tests
                blijven vrolijk groen terwijl de helft van de issues naar de verkeerde plek
                stuitert. Daarom staat er naast de unit-tests een{' '}
                <Gh href={`${BLOB}/tests/golden/README.md`}>golden-set</Gh>: bevroren echte gevallen
                met een bekende-goede uitkomst. Inclusief drie <strong>marge</strong>-gevallen die
                met 2-1 winnen &mdash; een testset waarin alles met 3-0 wint, slaagt namelijk voor
                altijd en bewaakt dus niets.
              </p>

              <p>
                <strong>3. De pijplijn repareert zichzelf; escalatie is de uitzondering.</strong> Een
                watchdog, een conflict-solver en een autofix-laag draaien zonder tussenkomst. De{' '}
                <code>fleet-doctor</code> rapporteert hard maar muteert nooit &mdash; diagnose en
                mutatie zijn bewust gescheiden bevoegdheden. Sinds kort geldt dat ook voor de
                KPI&apos;s zelf: een meting die alleen in een artifact blijft liggen, wordt door
                niemand gelezen. Komt de permission-denial-ratio van een run boven de drempel, dan
                opent de pijplijn daar nu z&eacute;lf een issue over &mdash; van <em>meten</em> naar{' '}
                <em>melden</em>, zonder dat er een mens hoeft te grasduinen in logs om te zien dat er
                iets structureel scheef staat.
              </p>

              <p>
                <strong>Waar te beginnen:</strong>{' '}
                <Gh href={`${BLOB}/docs/architectuur.md`}>docs/architectuur.md</Gh> is de kaart
                &mdash; de vier lagen, de pijplijn met z&apos;n drie mens-poorten, het
                consumer-contract en het security-model.{' '}
                <Gh href={`${BLOB}/docs/gitflow.md`}>docs/gitflow.md</Gh> is de detailspec: elk
                station, het capaciteitsmodel, het storingsdraaiboek en de machine-checkbare
                invarianten.
              </p>

              <Heading level={3} index={2}>
                Hoe het werkt
              </Heading>

              <p>
                Een consument-repo levert een dunne caller van ~15 regels; deze repo levert de
                logica:
              </p>

              <CodeSnippet lang="yaml">
                <span className="tok-c"># in de consument, .github/workflows/checks.yml</span>
                {'\n'}
                <span className="tok-n">on</span>
                <span className="tok-p">:</span>
                {'\n  '}
                <span className="tok-n">pull_request</span>
                <span className="tok-p">:</span>
                {'\n'}
                <span className="tok-n">jobs</span>
                <span className="tok-p">:</span>
                {'\n  '}
                <span className="tok-n">checks</span>
                <span className="tok-p">:</span>
                {'\n    '}
                <span className="tok-n">uses</span>
                <span className="tok-p">:</span>{' '}
                <span className="tok-s">
                  KCTHolman/deSchouwVloot/.github/workflows/checks.yml@main
                </span>
                {'\n    '}
                <span className="tok-n">secrets</span>
                <span className="tok-p">:</span> <span className="tok-s">inherit</span>
              </CodeSnippet>

              <p>
                Het dragende mechanisme is dat een reusable workflow draait in de{' '}
                <strong>context van de aanroeper</strong>:
              </p>

              <ul>
                <li>
                  <code>runs-on: &lt;lane&gt;</code> resolvet tegen de runnerpool van de{' '}
                  <em>aanroepende</em> repo;
                </li>
                <li>
                  <code>github.repository</code> is de <em>aanroepende</em> repo, niet deze;
                </li>
                <li>
                  <code>secrets: inherit</code> geeft de secrets van de <em>aanroeper</em> door.
                </li>
              </ul>

              <p>
                De Vloot levert dus de logica, de consument levert de hardware en de secrets. Dat is
                ook waarom dit werkt zonder GitHub-organisatie: er zijn geen org-level runners of
                org-secrets nodig.
              </p>

              <p>
                Het contract tussen beide is &eacute;&eacute;n bestand:{' '}
                <Gh href={`${BLOB}/.fleet.yml`}>
                  <code>.fleet.yml</code>
                </Gh>
                . Lanes, poorten, budgetten, labelnamen en de &quot;spine&quot; (workflows waarvan
                uitval <em>stil</em> zou zijn). Zie{' '}
                <Gh href={`${BLOB}/examples/tweede-consument.fleet.yml`}>
                  <code>examples/tweede-consument.fleet.yml</code>
                </Gh>{' '}
                voor hoe datzelfde contract eruitziet bij een project met een heel andere vorm
                &mdash; dat was de theorie; inmiddels is de proef ook echt gedaan. Sinds afgelopen
                week draait er een tweede, functioneel geheel ander project op de Vloot: andere taal,
                andere stack, geen self-hosted runner, alleen GitHub-hosted lanes. Geen regel
                fleet-logica geforkt om dat werkend te krijgen &mdash; dat is precies de test of de
                abstractie draagt, en die test is nu met een echt project doorstaan, niet alleen met
                een voorbeeldbestand.
              </p>

              <hr />

              <Heading level={3} index={3}>
                Beveiliging van d&eacute;ze repo
              </Heading>

              <p>
                Deze repo is publiek. Dat verandert de dreiging fundamenteel ten opzichte van het
                priv&eacute;-origineel, en dat is precies waar de meeste CI-ongelukken vandaan komen:
                niet uit slechte code, maar uit een <strong>aanname die stilletjes vervalt</strong>.
                Een <code>on: issues</code>-trigger is in een priv&eacute;repo een prima voordeur die
                alleen de eigenaar kan gebruiken. Diezelfde trigger in een publieke repo is een
                anonieme voordeur voor iedereen met een GitHub-account.
              </p>

              <p>Daarom geldt hier &eacute;&eacute;n harde regel:</p>

              <blockquote>
                <p>
                  <strong>Geen enkele workflow in deze repo heeft een eigen trigger.</strong>
                </p>
              </blockquote>

              <p>
                Niet &quot;alleen veilige triggers&quot; &mdash; g&eacute;&eacute;n. Alle 16
                workflows zijn <code>workflow_call</code>-only. Een reusable workflow start nooit
                vanzelf; hij draait uitsluitend als een andere workflow hem expliciet aanroept, en
                dan in de context van d&iacute;&eacute; aanroeper: op diens runners, met diens
                secrets, tegen diens repo. Roept een vreemde een workflow hieruit cross-repo aan, dan
                draait en betaalt hij dat volledig zelf. Er is geen pad van &quot;publiek
                internet&quot; naar compute of secrets van de eigenaar.
              </p>

              <p>
                Dat is geen belofte in proza maar een <strong>machinaal gehandhaafde</strong>{' '}
                eigenschap:
              </p>

              <CodeSnippet lang="bash">
                <span className="tok-k">bash</span> scripts/check-no-triggers.sh
              </CodeSnippet>

              <p>
                De guard faalt op <code>issues</code>, <code>pull_request</code>,{' '}
                <code>schedule</code>, <code>push</code> en <code>workflow_dispatch</code>, &eacute;n
                op het gevaarlijkste geval: een geldige <code>workflow_call</code> m&eacute;t een
                verboden trigger ernaast. Hij herkent ook de YAML-vormen die een na&iuml;eve{' '}
                <code>grep</code> mist &mdash; de gequote <code>&quot;on&quot;:</code> (de YAML
                1.1-booleanvalkuil) en de inline lijstvorm{' '}
                <code>on: [push, pull_request]</code>.{' '}
                <Gh href={`${BLOB}/scripts/check-no-triggers.test.sh`}>
                  <code>scripts/check-no-triggers.test.sh</code>
                </Gh>{' '}
                toetst al die gevallen.
              </p>

              <p>
                De voorbeeld-caller in{' '}
                <Gh href={`${REPO}/tree/main/examples`}>
                  <code>examples/</code>
                </Gh>{' '}
                heeft w&eacute;l een echte trigger &mdash; dat hoort ook, want dat is nou juist het
                punt: <strong>triggers leven in de consument, logica in de Vloot.</strong> Bestanden
                in <code>examples/</code> staan buiten <code>.github/workflows/</code> en worden door
                GitHub nooit geregistreerd.
              </p>

              <Heading level={4} index={4}>
                Wat er uit deze kopie is gehaald, en waarom
              </Heading>

              <p>Volledigheid is hier belangrijker dan een schone indruk:</p>

              <div className="gh-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Weggelaten</th>
                      <th>Reden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OMISSIONS.map((row) => (
                      <tr key={row.key}>
                        <td>{row.what}</td>
                        <td>{row.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p>
                Drie wijzigingen in{' '}
                <Gh href={`${BLOB}/.github/workflows/intake.yml`}>
                  <code>.github/workflows/intake.yml</code>
                </Gh>{' '}
                zijn geen weglating maar een <strong>verbetering</strong>, en staan voluit in de kop
                van dat bestand: de trigger werd <code>workflow_call</code>, het
                GitHub-App-token kreeg een expliciete <code>repositories:</code>-scope in plaats van
                installatiebreed, en de dedupe-stap is verwijderd omdat die issue-titels uit de
                doelrepo in een comment op d&eacute;ze repo plaatste &mdash; prima als beide
                repo&apos;s dezelfde zichtbaarheid hebben, een lek zodra dat niet meer zo is.
              </p>

              <Heading level={4} index={5}>
                Wat er bewust w&eacute;l in staat
              </Heading>

              <p>
                Geen secrets, in geen enkel bestand en in geen enkele commit. W&eacute;l: echte
                workflownamen, echte issue-nummers uit de historie, en commentaar dat benoemt wat er
                ooit misging. Dat commentaar is het waardevolste deel van deze repo &mdash; een
                workflow zonder de reden erachter is een workflow die de volgende persoon met een
                gerust hart weer stukmaakt.
              </p>

              <hr />

              <Heading level={3} index={6}>
                Zelf draaien
              </Heading>

              <p>
                Alle logica die iets beslist is een <strong>pure functie in bash of Python</strong>,
                offline testbaar zonder GitHub, zonder netwerk en zonder tokens. Dat is een
                ontwerpkeuze: de workflows eromheen blijven dom en voeren alleen uit, zodat het
                denkwerk in iets zit dat je op je laptop in een seconde kunt draaien.
              </p>

              <CodeSnippet lang="bash">
                <span className="tok-c"># alle testsuites</span>
                {'\n'}
                <span className="tok-k">for</span> suite <span className="tok-k">in</span>{' '}
                scripts/*.test.sh<span className="tok-p">;</span> <span className="tok-k">do</span>{' '}
                <span className="tok-k">bash</span>{' '}
                <span className="tok-s">
                  &quot;<span className="tok-v">$suite</span>&quot;
                </span>
                <span className="tok-p">;</span> <span className="tok-k">done</span>
                {'\n\n'}
                <span className="tok-c">
                  # de golden-set: doet de routeringstabel nog wat we bedoelen?
                </span>
                {'\n'}
                <span className="tok-k">bash</span> scripts/golden-run.sh
                {'\n\n'}
                <span className="tok-c"># de invariant-checker op zichzelf</span>
                {'\n'}
                <span className="tok-k">bash</span> scripts/fleet-doctor.sh --module consistentie
                --root .{'\n\n'}
                <span className="tok-c"># en het bewijs dat niets hier uit zichzelf kan vuren</span>
                {'\n'}
                <span className="tok-k">bash</span> scripts/check-no-triggers.sh
              </CodeSnippet>

              <p>
                Nodig: <code>bash</code>, <code>awk</code>, <code>sed</code>, <code>python3</code>{' '}
                met PyYAML. Geen netwerk.
              </p>
            </div>

            <ReadmeOutline />
          </div>

          <div className="gh-file-foot">
            <span>README.md &middot; KCTHolman/deSchouwVloot</span>
            <span>Tekst onveranderd &middot; links naar de repo</span>
          </div>
        </article>

        <div className="kh-link-row gh-next">
          <a className="kh-link" href={`${BLOB}/docs/architectuur.md`} target="_blank" rel="noopener">
            Verder lezen: architectuur.md &mdash; de kaart &rarr;
          </a>
          <a className="kh-link" href={`${BLOB}/docs/gitflow.md`} target="_blank" rel="noopener">
            gitflow.md &mdash; de detailspec &rarr;
          </a>
          <Link className="kh-link" href="/werk/logboek/">
            Of de niet-technische kant: het logboek
          </Link>
        </div>
      </main>
    </>
  )
}
