# Diepteslider en Architectuur-laag op /werk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vervang de binaire "Toon de techniek"-knop op `/werk` door een driestandenschuif (Overzicht · Techniek · Architectuur), voeg een nieuwe Architectuur-laag toe met geverifieerde security-/incident-content uit de publieke repo, en pas vijf gerichte tekstfixes toe — zonder de bestaande zes-secties-paginastructuur aan te raken.

**Architecture:** `JourneySection` krijgt een tweede, optionele content-tier (`deep`) naast de bestaande `tech`/`fail`/`children`; één gedeelde `depth`-state op `WerkJourney` (nu 3 waarden i.p.v. 2) stuurt via `data-depth` op de paginawrapper welke tiers zichtbaar zijn. Alle nieuwe content is data waar mogelijk (`INCIDENTS` naast de bestaande `CHECKS`/`METRICS`/`ROADMAP`), inline JSX waar dat het bestaande patroon van de pagina is (de twee security-kaarten, net als de bestaande self-hosted/RAG-MCP-kaarten).

**Tech Stack:** Next.js App Router, React 19, TypeScript, handgeschreven CSS (`app/styles/site.css`, `app/styles/widget.css`) — geen testframework in deze repo (`package.json` heeft alleen `typecheck` via `tsc --noEmit` en `doctor` via react-doctor). Verificatie per taak is dus: `npm run typecheck` + visuele controle van `/werk` in de browser, niet een test-suite.

## Global Constraints

- Geen nieuwe top-level secties op `/werk` — alle nieuwe content gaat in de bestaande checks-sectie (04).
- Geen naam-signaal ("Koen Holman — ...") toevoegen aan `/werk` zelf.
- Eén globale `depth`-control voor de hele pagina — geen sliders per sectie.
- Kernzinnen (de `lead`-prop van elke `JourneySection`) blijven ongewijzigd tussen de drie niveaus — de slider onthult uitsluitend extra blokken, nooit alternatieve tekst voor dezelfde stap (behalve de vijf expliciet benoemde tekstfixes in Taak 3, die niveau-onafhankelijk zijn).
- Geen overgangsanimaties op de depth-toggle — zelfde `display: none/block`-eenvoud als vandaag.
- Derde niveau heet **"Architectuur"** (niet "nerd-modus" of vergelijkbaar informeel label).
- De metriek-denominator (30,8% van hoeveel runs) en de telling "zes jobs" bij `pr-check.yml` in `components/showcase/run-data.tsx` blijven **ongewijzigd** — geen taak raakt die tekst aan.
- De dode `.dsv[data-depth="tech"]` CSS-regel in `app/styles/widget.css:659-660` blijft ongemoeid — niet gerelateerd aan dit werk.
- Alle nieuwe/aangepaste copy is Nederlands, eerste persoon, casual — geen pitch- of "beschikbaar voor werk"-toon.

---

### Task 1: Driestandenschuif — depth-mechanisme

**Files:**
- Modify: `components/werk/journey-section.tsx` (volledig bestand, ~50 regels)
- Modify: `app/styles/site.css:479-485` (depth-CSS, van 2 naar 3 standen; nieuwe slider-stijl erbij)
- Modify: `app/styles/widget.css:702-706`, `:856`, `:1266` (dode `.dsv-btn--depth`-regels verwijderen — enige consument was de knop die deze taak vervangt)
- Modify: `components/werk/werk-journey.tsx:1-95` (depth-state, slider-JSX, toelichtende paragraaf)

**Interfaces:**
- Produces: `JourneySection`'s nieuwe `deep?: ReactNode`-prop — uitsluitend zichtbaar wanneer de pagina-wrapper `data-depth="architectuur"` heeft. Taak 2 consumeert deze prop.
- Produces: `DEPTH_LEVELS = ['overzicht', 'techniek', 'architectuur'] as const` en `type Depth` in `werk-journey.tsx` (lokaal, niet geëxporteerd).
- Consumes: niets van andere taken — dit is de fundering.

- [ ] **Step 1: `JourneySection` — nieuwe `deep`-prop, twee tiers**

Vervang de volledige inhoud van `components/werk/journey-section.tsx`:

```tsx
'use client'

/* Eén halte in het scrollverhaal: alleen de kernzin staat in de "verhalende"
   stand. Alles daaronder zit in twee tiers, allebei gestuurd door data-depth
   op de gezamenlijke root in werk-journey.tsx (zie .dsv-depth-extra in
   site.css): "techniek" voor tech/fail/children (zoals voorheen), en het
   nieuwe "architectuur" voor deep — uitsluitend zichtbaar op het diepste
   niveau, en additief: niets verdwijnt als je verder schuift. */

import type { ReactNode } from 'react'

type JourneySectionProps = {
  id: string
  eyebrow: string
  title: ReactNode
  lead: ReactNode
  tech?: ReactNode
  fail?: ReactNode
  children?: ReactNode
  deep?: ReactNode
}

export function JourneySection({
  id,
  eyebrow,
  title,
  lead,
  tech,
  fail,
  children,
  deep,
}: JourneySectionProps) {
  const hasDepth = Boolean(tech || fail || children)
  const hasDeep = Boolean(deep)

  return (
    <section id={id} className="kh-journey-section">
      <p className="dsv-eyebrow">
        <span className="dsv-eyebrow-dot" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="dsv-title">{title}</h2>
      <p className="dsv-lead">{lead}</p>

      {hasDepth ? (
        <div className="dsv-depth-extra" data-tier="techniek">
          {tech ? (
            <p className="dsv-entry-tech">
              <span className="dsv-tech-label">achtergrond</span>
              {tech}
            </p>
          ) : null}
          {fail ? (
            <p className="dsv-entry-fail">
              <span className="dsv-fail-label">als het misgaat</span>
              {fail}
            </p>
          ) : null}
          {children}
        </div>
      ) : null}

      {hasDeep ? (
        <div className="dsv-depth-extra" data-tier="architectuur">
          {deep}
        </div>
      ) : null}
    </section>
  )
}
```

De originele `journey-section.tsx` heeft geen `'use client'`-directive (puur presentationeel, geen hooks/state) — voeg die hier ook **niet** toe.

- [ ] **Step 2: CSS — drie standen i.p.v. twee, plus slider-stijl**

In `app/styles/site.css`, vervang de bestaande regel rond regel 479-485:

```css
.dsv-depth-extra { display: none; }
.kh-werk-journey[data-depth="tech"] .dsv-depth-extra { display: block; }

.kh-werk-journey[data-depth="tech"] .dsv-entry-tech,
.kh-werk-journey[data-depth="tech"] .dsv-entry-fail {
  display: block;
}
```

door:

```css
.dsv-depth-extra { display: none; }

.kh-werk-journey[data-depth="techniek"] .dsv-depth-extra[data-tier="techniek"],
.kh-werk-journey[data-depth="architectuur"] .dsv-depth-extra[data-tier="techniek"],
.kh-werk-journey[data-depth="architectuur"] .dsv-depth-extra[data-tier="architectuur"] {
  display: block;
}

.kh-werk-journey[data-depth="techniek"] .dsv-entry-tech,
.kh-werk-journey[data-depth="techniek"] .dsv-entry-fail,
.kh-werk-journey[data-depth="architectuur"] .dsv-entry-tech,
.kh-werk-journey[data-depth="architectuur"] .dsv-entry-fail {
  display: block;
}

.dsv-depth-slider { max-width: 320px; }

.dsv-depth-slider input[type='range'] {
  width: 100%;
  accent-color: var(--kh-teal);
}

.dsv-depth-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--kh-ash);
}

.dsv-depth-labels .is-active { color: var(--kh-teal-soft); }
```

- [ ] **Step 3: Dode CSS opruimen die deze taak veroorzaakt**

In `app/styles/widget.css`, verwijder deze drie regels (enige consument van `.dsv-btn--depth` was de knop die in Step 4 verdwijnt — na deze taak bestaat de class nergens meer in `.tsx`-bestanden):

```css
.dsv-btn--depth[aria-pressed="true"] {
  border-color: rgba(125, 224, 210, 0.45);
  background: rgba(125, 224, 210, 0.12);
  color: var(--dsv-acc-soft);
}
```
(rond regel 702-706)

```css
.dsv-btn--depth { min-width: 166px; }
```
(regel 856)

```css
  .dsv-btn--depth { min-width: 148px; }
```
(regel 1266, binnen de bestaande media query — verwijder alléén deze regel, niet de omliggende `.dsv-btn`/`.dsv-btn--play`-regels in diezelfde media query).

- [ ] **Step 4: `werk-journey.tsx` — depth-state en slider-UI**

Voeg toe, direct na de bestaande imports (rond regel 24-26):

```tsx
const DEPTH_LEVELS = ['overzicht', 'techniek', 'architectuur'] as const
type Depth = (typeof DEPTH_LEVELS)[number]

const DEPTH_LABELS: Record<Depth, string> = {
  overzicht: 'Overzicht',
  techniek: 'Techniek',
  architectuur: 'Architectuur',
}
```

Vervang `const [depth, setDepth] = useState<'kern' | 'tech'>('kern')` door:

```tsx
const [depth, setDepth] = useState<Depth>('overzicht')
```

Vervang de knop (huidige regels 69-76):

```tsx
<button
  type="button"
  className="dsv-btn dsv-btn--depth"
  aria-pressed={depth === 'tech'}
  onClick={() => setDepth((d) => (d === 'tech' ? 'kern' : 'tech'))}
>
  {depth === 'tech' ? 'Verberg de techniek' : 'Toon de techniek'}
</button>
```

door:

```tsx
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
```

De knop zat in een flex-rij samen met de repo-link (`<div style={{ display: 'flex', alignItems: 'center', gap: 20, ... }}>`). Een `<input type="range">` heeft meer breedte nodig dan die rij bood — verwijder de flex-wrapper en plaats de slider en de repo-link elk op hun eigen regel:

```tsx
<div style={{ marginTop: 20 }}>
  <div className="dsv-depth-slider">
    {/* ...input + labels zoals hierboven... */}
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
```

Herschrijf tot slot de toelichtende paragraaf eronder (huidige regels 90-93):

```tsx
<p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: 'rgba(200, 220, 238, 0.55)' }}>
  De kernzinnen staan er sowieso. Deze schuif voegt per stap steeds meer laag toe: eerst de
  achtergrond, dan de bewijsvoering erachter.
</p>
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: geen errors. Als er een fout komt over `depth === 'tech'` of `'kern'` ergens anders in `werk-journey.tsx`, zoek met een grep naar `'kern'` en `'tech'` in dat bestand — alle drie de oude vergelijkingen (`depth === 'tech'` op de knop, en de initiële state) moeten vervangen zijn; er hoort nergens meer een losstaande `'kern'`/`'tech'`-stringvergelijking over te blijven.

- [ ] **Step 6: Visuele verificatie in de browser**

Start de dev server en open `/werk`. Controleer:
- De schuif staat standaard op "Overzicht"; alleen kernzinnen zijn zichtbaar, geen enkel `dsv-depth-extra`-blok.
- Sleep naar "Techniek": de bestaande achtergrond/als-het-misgaat-teksten en de runner-kaarten (impact-analyse, self-hosted, RAG/MCP) bij stap 03, en de checks-grid/metrics/roadmap bij stap 04 verschijnen — exact zoals de oude "Toon de techniek"-knop dat deed.
- Sleep naar "Architectuur": er verschijnt (nog) niets nieuws bovenop "Techniek" — verwacht, Taak 2 voegt die content toe. Niets van de Techniek-content verdwijnt.
- Sleep terug naar "Overzicht": alles klapt weer dicht, geen restanten.
- De oude knoptekst "Toon de techniek"/"Verberg de techniek" komt nergens meer voor op de pagina.

- [ ] **Step 7: Commit**

```bash
git add components/werk/journey-section.tsx app/styles/site.css app/styles/widget.css components/werk/werk-journey.tsx
git commit -m "Vervang techniek-knop door driestandenschuif (Overzicht/Techniek/Architectuur)"
```

---

### Task 2: Architectuur-laag — incidenten en security-by-construction

**Files:**
- Modify: `components/showcase/technisch-data.tsx` (nieuwe export `Incident`/`INCIDENTS`, `REPO` exporteren)
- Modify: `components/werk/werk-journey.tsx` (import + `deep`-prop op de checks-`JourneySection`)

**Interfaces:**
- Consumes: `JourneySection`'s `deep`-prop uit Taak 1.
- Produces: `INCIDENTS: Incident[]` en `REPO: string`, geëxporteerd uit `technisch-data.tsx` — geen andere taak consumeert deze verder.

- [ ] **Step 1: `INCIDENTS`-data en `REPO`-export**

In `components/showcase/technisch-data.tsx`, verander regel 6 van:

```ts
const REPO = 'https://github.com/KCTHolman/deSchouwVloot'
```

naar:

```ts
export const REPO = 'https://github.com/KCTHolman/deSchouwVloot'
```

Voeg aan het eind van het bestand toe (na de bestaande `WORKFLOWS_URL`-export):

```ts
export type Incident = { tag: string; symptom: string; lesson: string }

/** Groen is geen bewijs — drie keer stond alles groen terwijl het systeem kapot was. */
export const INCIDENTS: Incident[] = [
  {
    tag: 'I23',
    symptom: 'de golden-set slaagt',
    lesson:
      'elk geval won met 3-0, dus geen enkel te breed trefwoord kon iets kantelen — de run ' +
      'slaagde voor altijd. Nu moeten grensgevallen met marge 1 winnen.',
  },
  {
    tag: 'I27',
    symptom: 'trigger, pad, naam en permissies allemaal correct',
    lesson:
      'toch tien uur lang geen enkele run — de complete spine lag plat. Nu wordt gemeten of ' +
      'de bron liep én de luisteraar reageerde, niet alleen of de configuratie klopte.',
  },
  {
    tag: 'I28',
    symptom: 'de spine "werkt", niets is rood',
    lesson:
      'een station miste een script bij de consument, draaide fail-closed, en mergede per ' +
      'constructie nooit meer. Nu is dat expliciet getest.',
  },
]
```

- [ ] **Step 2: Import in `werk-journey.tsx`**

Verander de bestaande import (huidige regel 23):

```tsx
import { CHECKS, METRICS, ROADMAP, WORKFLOWS_URL } from '@/components/showcase/technisch-data'
```

naar:

```tsx
import { CHECKS, INCIDENTS, METRICS, REPO, ROADMAP, WORKFLOWS_URL } from '@/components/showcase/technisch-data'
```

- [ ] **Step 3: `deep`-prop op de checks-`JourneySection`**

De checks-sectie opende vóór Taak 1 als volgt (regelnummers zijn door Taak 1's wijzigingen verderop in het bestand opgeschoven — zoek op de exacte tekst hieronder, niet op het regelnummer):

```tsx
<JourneySection
  id="checks"
  eyebrow="04 · Checks"
  title="Zes bewakingen moeten groen zijn"
  lead="Zes bewakingen moeten groen zijn voordat er iets verdergaat. De tests draaien over de volledige rekenkern van het project, niet alleen over het ene stukje dat net veranderde. Een tweede agent leest het werk na; die review is advies, alleen de tests kunnen tegenhouden."
  tech={checks.tech}
  fail={checks.fail}
>
```

Voeg een `deep`-prop toe (lead/tech/fail/id/eyebrow/title ongewijzigd):

```tsx
<JourneySection
  id="checks"
  eyebrow="04 · Checks"
  title="Zes bewakingen moeten groen zijn"
  lead="Zes bewakingen moeten groen zijn voordat er iets verdergaat. De tests draaien over de volledige rekenkern van het project, niet alleen over het ene stukje dat net veranderde. Een tweede agent leest het werk na; die review is advies, alleen de tests kunnen tegenhouden."
  tech={checks.tech}
  fail={checks.fail}
  deep={
    <>
      <div className="dsv-tech-label">Groen is geen bewijs</div>
      <p className="dsv-entry-detail" style={{ marginTop: 8 }}>
        Drie keer stond alles groen terwijl het systeem feitelijk kapot was &mdash; de
        verdediging is telkens hetzelfde principe: meet het gedrag, niet de configuratie.
      </p>
      <div className="dsv-checks" style={{ marginTop: 12 }}>
        {INCIDENTS.map((incident) => (
          <div key={incident.tag} className="dsv-check">
            <span className="dsv-check-tag">{incident.tag}</span>
            <span className="dsv-check-title">{incident.symptom}</span>
            <p className="dsv-check-body">{incident.lesson}</p>
            <a
              className="kh-link dsv-check-link"
              href={`${REPO}/blob/main/README.md`}
              target="_blank"
              rel="noopener"
            >
              Bekijk in repo &rarr;
            </a>
          </div>
        ))}
      </div>

      <div className="dsv-tech-label" style={{ marginTop: 20 }}>
        Vertrouwensniveaus, geen platte agent
      </div>
      <div className="dsv-runner" style={{ marginTop: 8 }}>
        <p className="dsv-runner-eyebrow">
          <span className="dsv-eyebrow-dot" aria-hidden="true" />
          untrusted vs. owner
        </p>
        <div>
          <div className="dsv-runner-title">Wat een agent mag, en wat niet</div>
          <p className="dsv-runner-body">
            Untrusted werk (PR- of issue-inhoud van buiten de flow) draait in een
            sandbox-container zonder docker-daemon en zonder host-mounts, nooit met deploy-
            of domein-secrets in scope, en nooit via <code>pull_request_target</code> naar
            een self-hosted runner. Owner-bevoegdheden (host-mutaties, releases,
            registraties) lopen uitsluitend via een apart, expliciet gelogd kanaal &mdash;
            nooit vanuit een workflow zelf.
          </p>
        </div>
        <a
          className="kh-link dsv-check-link"
          href={`${REPO}/blob/main/docs/architectuur.md`}
          target="_blank"
          rel="noopener"
        >
          Bekijk in repo &rarr;
        </a>
      </div>

      <div className="dsv-runner" style={{ marginTop: 12 }}>
        <p className="dsv-runner-eyebrow">
          <span className="dsv-eyebrow-dot" aria-hidden="true" />
          publieke kopie &middot; bewuste redactie
        </p>
        <div>
          <div className="dsv-runner-title">Publieke kopie &ne; publieke voordeur</div>
          <p className="dsv-runner-body">
            De host-diagnostiekworkflow en concrete hostcijfers (RAM, schijf, co-hostende
            diensten) zijn bewust uit deze publieke kopie gehaald: legitiem gereedschap voor
            de eigenaar, maar publiek een kant-en-klare doelwitlijst. Security-denken zit ook
            in wat je niet laat zien.
          </p>
        </div>
        <a
          className="kh-link dsv-check-link"
          href={`${REPO}/blob/main/README.md`}
          target="_blank"
          rel="noopener"
        >
          Bekijk in repo &rarr;
        </a>
      </div>
    </>
  }
>
```

De bestaande kinderen van deze `JourneySection` (metrics, checks-grid, de vier `dsv-entry-detail`-alinea's, roadmap) blijven precies zoals ze zijn — alleen de openings-tag krijgt de nieuwe `deep`-prop erbij, de sluit-tag (`</JourneySection>`) blijft ongewijzigd.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: geen errors — met name geen "unused variable" op `REPO`/`INCIDENTS` (ze worden nu allebei gebruikt) en geen type-mismatch op de `deep`-prop (moet `ReactNode` accepteren, een JSX-fragment voldoet daaraan).

- [ ] **Step 5: Visuele verificatie in de browser**

Open `/werk`, sleep de slider naar "Architectuur", scroll naar stap 04 (Checks). Controleer:
- Kop "Groen is geen bewijs" met de inleidende zin, gevolgd door drie kaarten (I23/I27/I28) in dezelfde grid-stijl als de bestaande zes-checks-grid.
- Elke incident-kaart heeft een werkende "Bekijk in repo →"-link die naar `README.md` op GitHub wijst.
- Daaronder de twee nieuwe kaarten ("Wat een agent mag, en wat niet" / "Publieke kopie ≠ publieke voordeur"), in dezelfde `.dsv-runner`-stijl als de bestaande self-hosted/RAG-MCP-kaarten bij stap 03, elk met een eigen "Bekijk in repo →"-link (architectuur.md resp. README.md).
- Sleep terug naar "Techniek": alle vier de nieuwe blokken verdwijnen, de bestaande checks/metrics/roadmap-content blijft staan.

- [ ] **Step 6: Commit**

```bash
git add components/showcase/technisch-data.tsx components/werk/werk-journey.tsx
git commit -m "Voeg Architectuur-laag toe: I23/I27/I28-incidenten en security-by-construction"
```

---

### Task 3: Vijf tekstfixes

**Files:**
- Modify: `components/werk/werk-journey.tsx` (vier tekstfixes: eyebrow, intro, stap 03, stap 05, stap 06)
- Modify: `components/home-hero.tsx` (CTA-tekst)

**Interfaces:** geen — pure contentwijzigingen, onafhankelijk van Taak 1 en 2. Kan in willekeurige volgorde t.o.v. die twee taken.

- [ ] **Step 1: Eyebrow en CTA-tekst — "Huidige AI-projecten" → "Waar ik momenteel aan bouw"**

In `components/werk/werk-journey.tsx`, verander:

```tsx
<p className="kh-eyebrow">Huidige AI-projecten</p>
```

naar:

```tsx
<p className="kh-eyebrow">Waar ik momenteel aan bouw</p>
```

In `components/home-hero.tsx`, verander:

```tsx
<Link className="khcta khcta--primary" href="/werk/">
  Huidige AI-projecten &#8594;
</Link>
```

naar:

```tsx
<Link className="khcta khcta--primary" href="/werk/">
  Waar ik momenteel aan bouw &#8594;
</Link>
```

- [ ] **Step 2: Intro — probleem vóór de naam**

In `components/werk/werk-journey.tsx`, verander:

```tsx
<p className="kh-lead">
  deSchouwVloot is waar de gitflow begint: geen productcode, maar de gedeelde workflows en
  standaarden waarop mijn eigen projectrepo&apos;s draaien &mdash; de meeste daarvan priv&eacute;.
  Van idee tot lancering, in kernzinnen met optioneel de techniek erachter: elke bewering
  hieronder is na te trekken in deze publieke repo.
</p>
```

naar:

```tsx
<p className="kh-lead">
  Ik bouw zo dat AI-agents het grootste deel van het ontwikkelproces zelfstandig kunnen
  doen, zonder dat ik de controle over het resultaat uit handen geef. deSchouwVloot is de
  gedeelde workflows en standaarden waarop mijn eigen projectrepo&apos;s draaien &mdash;
  geen productcode, de meeste repo&apos;s zelf priv&eacute;. Van idee tot lancering, in
  kernzinnen met optioneel de techniek erachter: elke bewering hieronder is na te trekken in
  deze publieke repo.
</p>
```

- [ ] **Step 3: Kernzin stap 03 ("bouwen") inkorten**

In `components/werk/werk-journey.tsx`, verander de `lead`-prop van de `JourneySection id="bouwen"` van:

```
"Triage bepaalt, in de eigen repo van dat project, wat voor werk het is en welk deel het raakt. Plannen doet twee dingen tegelijk: het toetst het idee aan wat ik voor dát project heb vastgelegd — constitution.md voor de harde grenzen, doelen.md voor de richting — én het maakt een impact-analyse, die de scope afbakent en vastlegt aan welke criteria het resultaat moet voldoen. Geen plan zonder afbakening en zonder een concrete manier om het na te trekken. Zo blijf ik ook hier aan het stuur, zonder dat ik per idee hoef te klikken: de eisen liggen al vast voordat de agent begint. Bouwen voert het plan daarna uit, op een eigen machine en met een limiet — loopt de agent vast, dan stopt hij vanzelf."
```

naar:

```
"Triage bepaalt wat voor werk het is; plannen toetst het aan mijn vastgelegde grenzen en bakent de scope af voordat er iets gebouwd wordt. Bouwen voert dat plan daarna uit op een eigen machine, met een limiet — loopt de agent vast, dan stopt hij vanzelf."
```

- [ ] **Step 4: Sectie 05 directere zin**

In `components/werk/werk-journey.tsx`, verander de `lead`-prop van de `JourneySection id="mens"` van:

```
"Waar de eisen uit stap 3 het kader al zetten, is dit waar ik zelf op de knop druk: bij de merge van elke fase, bij de uiteindelijke release, en bij een escalatie zodra een agent er zelf niet uitkomt. Drie soorten plekken, verder nergens — al het andere gaat vanzelf door zodra het groen staat."
```

naar:

```
"Ik grijp maar op drie momenten zelf in: bij de merge van elke fase, bij de release, en wanneer een agent escaleert omdat hij er zelf niet uitkomt. Verder nergens — al het andere gaat vanzelf door zodra het groen staat."
```

- [ ] **Step 5: Sectie 06 — "eigen grondwet" verduidelijkt**

In `components/werk/werk-journey.tsx`, verander in de `lead`-prop van de `JourneySection id="live"` het fragment:

```
eigen doelen, eigen wetgeving in zijn constitution.md, eigen aanvullingen op de tests
```

naar:

```
eigen doelen, een eigen grondwet in zijn constitution.md die de harde grenzen vastlegt, eigen aanvullingen op de tests
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: geen errors (dit zijn pure stringwijzigingen, geen type-impact verwacht).

- [ ] **Step 7: Visuele verificatie in de browser**

Open `/werk` op niveau "Overzicht" (standaard) en lees de pagina van boven naar beneden. Controleer:
- Eyebrow leest "Waar ik momenteel aan bouw".
- De introalinea noemt eerst het probleem/de aanpak, dan pas de naam "deSchouwVloot".
- Stap 03 se kernzin is twee zinnen, niet vijf.
- Stap 05 se kernzin begint met "Ik grijp maar op drie momenten zelf in...".
- Stap 06 se kernzin bevat "een eigen grondwet in zijn constitution.md die de harde grenzen vastlegt".
- Open de homepage (`/`) en controleer dat de CTA-knop ook "Waar ik momenteel aan bouw →" leest.

- [ ] **Step 8: Commit**

```bash
git add components/werk/werk-journey.tsx components/home-hero.tsx
git commit -m "Herschrijf vijf kernzinnen op /werk: probleem voor naam, korter, minder jargon"
```
