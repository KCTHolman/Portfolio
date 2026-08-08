'use client'

/* ==========================================================================
   /werk/ — het scrollverhaal.

   Geen keuzescherm meer, geen apart logboek: zes haltes van idee tot
   lancering, elk met een kernzin en een optionele technische laag. Terwijl
   je scrolt verandert de vloot rechts (variant="journey") mee — de
   voortgang komt uit useJourneyProgress, dat de sectiegrenzen meet, niet uit
   een los stappenteller.

   De inhoud hergebruikt/comprimeert wat er al stond: RUN_STEPS uit het oude
   logboek, en CHECKS/METRICS/ROADMAP uit de technische weergave.
   ========================================================================== */

import { useRef, useState } from 'react'

import { Link } from '@/components/link'
import { DirectionalTransition } from '@/components/directional-transition'
import { Fleet } from '@/components/fleet-lazy'
import { ScrollCue } from '@/components/scroll-cue'
import { RUN_STEPS } from '@/components/showcase/run-data'
import { CHECKS, METRICS, ROADMAP, WORKFLOWS_URL } from '@/components/showcase/technisch-data'
import { useJourneyProgress } from '@/lib/use-journey-progress'

import { JourneySection } from './journey-section'

const SECTION_IDS = ['idee', 'routering', 'bouwen', 'checks', 'mens', 'live'] as const

const DEPTH_LEVELS = ['overzicht', 'techniek', 'architectuur'] as const
type Depth = (typeof DEPTH_LEVELS)[number]

const DEPTH_LABELS: Record<Depth, string> = {
  overzicht: 'Overzicht',
  techniek: 'Techniek',
  architectuur: 'Architectuur',
}

export function WerkJourney() {
  const progressRef = useJourneyProgress(SECTION_IDS)
  /* Geen state: dit wisselt op de muis, niet op een render. draw() in
     use-fleet-scene.ts leest 'm elke frame en mengt de vorm er zelf naartoe. */
  const githubHoverRef = useRef(false)
  const onGithubEnter = () => {
    githubHoverRef.current = true
  }
  const onGithubLeave = () => {
    githubHoverRef.current = false
  }
  const [depth, setDepth] = useState<Depth>('overzicht')

  const idee = RUN_STEPS[0]
  const routering = RUN_STEPS[1]
  const plan = RUN_STEPS[6] // epic/plan-critic-stap draagt de impact-analyse
  const bouwen = RUN_STEPS[7] // build-stap draagt de self-hosted/CLI-details
  const checks = RUN_STEPS[8]
  const merge = RUN_STEPS[9]
  const release = RUN_STEPS[10]

  return (
    <>
      <Fleet variant="journey" progressRef={progressRef} githubHoverRef={githubHoverRef} />

      <DirectionalTransition>
      <main className="kh-main kh-main--werk" id="inhoud">
        <section className="kh-werk-hero" style={{ padding: '56px 0 0', maxWidth: '520px' }}>
          <p className="kh-eyebrow">Huidige AI-projecten</p>
          <h1 className="kh-page-title">
            Een pijplijn die <span className="kh-accent">zichzelf</span> bewaakt
          </h1>
          <p className="kh-lead">
            deSchouwVloot is waar de gitflow begint: geen productcode, maar de gedeelde workflows en
            standaarden waarop mijn eigen projectrepo&apos;s draaien &mdash; de meeste daarvan priv&eacute;.
            Van idee tot lancering, in kernzinnen met optioneel de techniek erachter: elke bewering
            hieronder is na te trekken in deze publieke repo.
          </p>
          <div style={{ marginTop: 20 }}>
            <div className="dsv-depth-slider">
              <input
                type="range"
                min={0}
                max={DEPTH_LEVELS.length - 1}
                step={1}
                value={DEPTH_LEVELS.indexOf(depth)}
                onChange={(e) => setDepth(DEPTH_LEVELS[Number(e.target.value)])}
                aria-label="Hoeveel diepgang wil je zien: overzicht, techniek of architectuur"
              />
              <div className="dsv-depth-labels">
                {DEPTH_LEVELS.map((level) => (
                  <span key={level} className={level === depth ? 'is-active' : undefined}>
                    {DEPTH_LABELS[level]}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p style={{ marginTop: 14 }}>
            <a
              className="kh-link"
              href="https://github.com/KCTHolman/deSchouwVloot"
              target="_blank"
              rel="noopener"
              onMouseEnter={onGithubEnter}
              onMouseLeave={onGithubLeave}
              onFocus={onGithubEnter}
              onBlur={onGithubLeave}
            >
              Gelijk naar de repo
            </a>
          </p>
          <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: 'rgba(200, 220, 238, 0.55)' }}>
            De kernzinnen staan er sowieso. Deze schuif voegt per stap steeds meer laag toe: eerst
            de achtergrond, dan de bewijsvoering erachter.
          </p>
          <ScrollCue />
        </section>

        <div className="kh-werk-grid">
          <div className="kh-werk-copy kh-werk-journey" data-depth={depth}>
            <JourneySection
              id="idee"
              eyebrow="01 · Idee"
              title="Een los idee is genoeg"
              lead="Eén zin is genoeg, zoals ik het idee bedenk — maar uitgebreider mag ook, dat maakt voor de inbox niet uit. Geen lijstje eisen, geen project vooraf gekozen: alles gaat naar dezelfde inbox, en wordt daarna hoe dan ook getoetst via triage en de impact-analyse verderop."
              tech={idee.tech}
            />

            <JourneySection
              id="routering"
              eyebrow="02 · Routering"
              title="Zelf het juiste project vinden"
              lead="Eén poort, meerdere projecten. Het idee zelf is genoeg om te bepalen welke projectrepo het raakt — weet de poort het niet zeker, dan kiest hij niet, maar vraagt hij het. Vanaf hier speelt de rest zich af in de eigen repo van dat project, die voor triage, checks en releases naar de gedeelde workflows hier verwijst. Een nieuw project sluit op dezelfde manier aan: dezelfde standaarden gelden voor iedereen, maar de eigen eisen en tests van dat project zijn zelf in te richten en bij te sturen, zonder dat deSchouwVloot zelf hoeft te veranderen."
              tech={routering.tech}
              fail={routering.fail}
            />

            <JourneySection
              id="bouwen"
              eyebrow="03 · Triage, plan, bouwen"
              title="De agent werkt het zelf uit"
              lead="Triage bepaalt, in de eigen repo van dat project, wat voor werk het is en welk deel het raakt. Plannen doet twee dingen tegelijk: het toetst het idee aan wat ik voor dát project heb vastgelegd — constitution.md voor de harde grenzen, doelen.md voor de richting — én het maakt een impact-analyse, die de scope afbakent en vastlegt aan welke criteria het resultaat moet voldoen. Geen plan zonder afbakening en zonder een concrete manier om het na te trekken. Zo blijf ik ook hier aan het stuur, zonder dat ik per idee hoef te klikken: de eisen liggen al vast voordat de agent begint. Bouwen voert het plan daarna uit, op een eigen machine en met een limiet — loopt de agent vast, dan stopt hij vanzelf."
              tech={bouwen.tech}
              fail={bouwen.fail}
            >
              <div className="dsv-runner" style={{ marginTop: 16 }}>
                <p className="dsv-runner-eyebrow">
                  <span className="dsv-eyebrow-dot" aria-hidden="true" />
                  impact-analyse &middot; scope en criteria
                </p>
                <div>
                  <div className="dsv-runner-title">Geen bouw zonder afgebakend plan</div>
                  <p className="dsv-runner-body">{plan.tech}</p>
                </div>
                <p className="dsv-entry-fail" style={{ marginTop: 0 }}>
                  <span className="dsv-fail-label">als het misgaat</span>
                  {plan.fail}
                </p>
              </div>

              <div className="dsv-runner" style={{ marginTop: 12 }}>
                <p className="dsv-runner-eyebrow">
                  <span className="dsv-eyebrow-dot" aria-hidden="true" />
                  self-hosted &middot; geen kant-en-klare Action
                </p>
                <div>
                  <div className="dsv-runner-title">Waarom niet gewoon een Claude Action</div>
                  <p className="dsv-runner-body">
                    De build draait niet in de sandbox van een kant-en-klare GitHub Action, maar op
                    een eigen server die de volle agent-CLI aanroept &mdash; met toegang tot de
                    complete toolset in plaats van de smallere interface die een Action biedt, en
                    met eigen concurrency-, budget- en lane-regels in plaats van wat een Action
                    toestaat. Dat verschil is precies wat dit soepel houdt op een taak die
                    meegroeit, in plaats van alleen op de taak waarvoor de Action ooit gebouwd is.
                  </p>
                </div>
                <div className="dsv-runner-stats">
                  <span className="dsv-chip">volle agent-cli</span>
                  <span className="dsv-chip">eigen self-hosted runner</span>
                  <span className="dsv-chip">eigen turn-budget per taaktype</span>
                </div>
              </div>

              <div className="dsv-runner" style={{ marginTop: 12 }}>
                <p className="dsv-runner-eyebrow">
                  <span className="dsv-eyebrow-dot" aria-hidden="true" />
                  eigendom van kennis, niet van de pijplijn
                </p>
                <div>
                  <div className="dsv-runner-title">RAG en MCP horen bij het project, niet bij de vloot</div>
                  <p className="dsv-runner-body">
                    Naast <code>constitution.md</code> en <code>doelen.md</code> brengt een project vaak
                    ook zijn eigen retrieval mee: RAG die antwoorden ophaalt uit de eigen documentatie of
                    logs, en een eigen MCP-server die de agent gestructureerde toegang geeft tot de tools
                    en data van dat project. deSchouwVloot zelf blijft daarbuiten &mdash; het bevat geen
                    domeinlogica, dus die kennis hoort bij het project, niet bij de machinerie eromheen.
                  </p>
                </div>
              </div>
            </JourneySection>

            <JourneySection
              id="checks"
              eyebrow="04 · Checks"
              title="Zes bewakingen moeten groen zijn"
              lead="Zes bewakingen moeten groen zijn voordat er iets verdergaat. De tests draaien over de volledige rekenkern van het project, niet alleen over het ene stukje dat net veranderde. Een tweede agent leest het werk na; die review is advies, alleen de tests kunnen tegenhouden."
              tech={checks.tech}
              fail={checks.fail}
            >
              <div className="dsv-tech-label" style={{ marginTop: 16 }}>
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

              <div className="dsv-tech-head" style={{ marginTop: 20 }}>
                <div className="dsv-tech-label">Zes controles die elke run bewaken</div>
                <a className="kh-link dsv-tech-link" href={WORKFLOWS_URL} target="_blank" rel="noopener">
                  Alle 16 workflows &rarr;
                </a>
              </div>
              <div className="dsv-checks">
                {CHECKS.map((check) => (
                  <div key={check.tag} className="dsv-check">
                    <span className="dsv-check-tag">{check.tag}</span>
                    <span className="dsv-check-title">{check.title}</span>
                    <p className="dsv-check-body">{check.body}</p>
                    <a className="kh-link dsv-check-link" href={check.href} target="_blank" rel="noopener">
                      Bekijk in repo &rarr;
                    </a>
                  </div>
                ))}
              </div>

              <div className="dsv-tech-label" style={{ marginTop: 20 }}>
                Wat de kwaliteit sterk houdt, verder dan de zes checks
              </div>
              <p className="dsv-entry-detail" style={{ marginTop: 8 }}>
                Een plattegrond van de codebase werd vroeger met de hand bijgehouden en dreef stil uit
                de pas met de code. Die is nu gegenereerd en CI-bewaakt: documentatie die scheef staat,
                houdt de build tegen &mdash; een digest-guard, geen vertrouwen op de hand.
              </p>
              <p className="dsv-entry-detail">
                Een van de projecten die op de vloot draait heeft al een stevige eigen testset &mdash;
                precies het soort dekking waar deze checks op leunen, en waar nieuwe projecten naartoe
                groeien zodra ze aanhaken.
              </p>
              <p className="dsv-entry-detail">
                Daarachter draait meer zonder dat ik het zie: een watchdog die vastgelopen runs
                signaleert, een autofix- en conflict-solver-stap die een rode PR eerst zelf probeert
                te herstellen v&oacute;&oacute;r er ge&euml;scaleerd wordt, de epic-orchestrator die
                bijhoudt welke fase van een epic open mag staan, en een branch-janitor die wekelijks
                gemergede branches opruimt &mdash; via de PR-historie gecontroleerd, niet via een
                git-ancestor-check, want deze repo&apos;s squash-mergen. Zelf-herstel is de norm,
                een escalatie naar mij de uitzondering.
              </p>
              <p className="dsv-entry-detail">
                &Eacute;&eacute;n project gaat nog een stap verder: opt-in, standaard uit, kan het
                zelf een issue aanmaken op mijn eigen repo met een gecureerde dagelijkse digest
                &mdash; health-checks, nieuwe momentopnames, loggaten-hypotheses. Zo&apos;n issue
                legt daarna precies dezelfde weg af als elk ander idee: triage, plannen, bouwen,
                checks, en mijn goedkeuring op de merge.
              </p>
              <div className="dsv-runner-stats" style={{ marginTop: 10 }}>
                <span className="dsv-chip">pr-autofix</span>
                <span className="dsv-chip">pr-conflict-solver</span>
                <span className="dsv-chip">epic-orchestrator</span>
                <span className="dsv-chip">branch-janitor</span>
              </div>

              <div className="dsv-tech-label" style={{ marginTop: 20 }}>
                Vandaag &middot; morgen
              </div>
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
            </JourneySection>

            <JourneySection
              id="mens"
              eyebrow="05 · Mens beslist"
              title="Precies drie soorten plekken"
              lead="Waar de eisen uit stap 3 het kader al zetten, is dit waar ik zelf op de knop druk: bij de merge van elke fase, bij de uiteindelijke release, en bij een escalatie zodra een agent er zelf niet uitkomt. Drie soorten plekken, verder nergens — al het andere gaat vanzelf door zodra het groen staat."
            >
              <p className="dsv-entry-tech">
                <span className="dsv-tech-label">merge</span>
                {merge.tech}
              </p>
              <p className="dsv-entry-fail">
                <span className="dsv-fail-label">als het misgaat</span>
                {merge.fail}
              </p>
              <p className="dsv-entry-tech">
                <span className="dsv-tech-label">release</span>
                {release.tech}
              </p>
              <p className="dsv-entry-fail">
                <span className="dsv-fail-label">als het misgaat</span>
                {release.fail}
              </p>
            </JourneySection>

            <JourneySection
              id="live"
              eyebrow="06 · Live"
              title="Van idee tot lancering"
              lead="Wat er buiten staat is nooit half: pas als een epic in zijn geheel binnen is, gaat het naar buiten, met mijn goedkeuring op de release-knop. Elk project dat aanhaakt sluit op dezelfde manier aan: eigen doelen, eigen wetgeving in zijn constitution.md, eigen aanvullingen op de tests — en dezelfde drie plekken waar ik het stuur in handen houd. Van los idee tot lancering — de pijplijn doet het werk, ik zet de koers."
            />
          </div>
        </div>

        <section style={{ padding: '24px 0 96px', maxWidth: '520px' }}>
          <div className="kh-cta-row">
            <a
              className="khcta khcta--ghost"
              href="https://github.com/KCTHolman/deSchouwVloot"
              target="_blank"
              rel="noopener"
              onMouseEnter={onGithubEnter}
              onMouseLeave={onGithubLeave}
              onFocus={onGithubEnter}
              onBlur={onGithubLeave}
            >
              Bekijk de repo
            </a>
            <a
              className="khcta khcta--ghost"
              href="https://github.com/KCTHolman/deSchouwVloot/blob/main/docs/architectuur.md"
              target="_blank"
              rel="noopener"
              onMouseEnter={onGithubEnter}
              onMouseLeave={onGithubLeave}
              onFocus={onGithubEnter}
              onBlur={onGithubLeave}
            >
              Architectuur &amp; ontwerpkeuzes
            </a>
            <Link
              className="khcta khcta--primary"
              href="/werk/readme/"
              aria-label="Lees de README van deSchouwVloot"
              onMouseEnter={onGithubEnter}
              onMouseLeave={onGithubLeave}
              onFocus={onGithubEnter}
              onBlur={onGithubLeave}
            >
              README &rarr;
            </Link>
          </div>
        </section>
      </main>
      </DirectionalTransition>
    </>
  )
}
