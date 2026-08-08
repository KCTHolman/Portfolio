# Diepteslider en Architectuur-laag op /werk

**Status:** ontwerp, klaar voor implementatieplan
**Branch:** nog te kiezen bij implementatie

## Doel

Twee AI-audits over de tekst van `/werk` kwamen binnen. Ronde 1 gaf 14 tekstuele
verbeterpunten met de expliciete eis: verbeteren zonder de site om te gooien. Ronde 2 was
beter onderbouwd (geverifieerd tegen de publieke repo, zie hieronder) maar stelde feitelijk
een volledige herbouw voor — nieuwe hero, 11 secties, voor/na-diagrammen, nieuwe
homepage-positionering. Dat laatste gaat niet door: dit ontwerp behoudt de bestaande
zes-secties-scrollstructuur en de bestaande architectuur (`JourneySection`,
`useJourneyProgress`, de `Fleet`-scène) volledig, en beperkt zich tot drie dingen die
zonder herstructurering kunnen:

1. De bestaande binaire "Toon de techniek"-knop wordt een **driestandenschuif**
   (Overzicht · Techniek · Architectuur) — hetzelfde mechanisme, één stand dieper.
2. Er komt een **Architectuur-laag** bij de checks-sectie met content die nu alleen in het
   README van de publieke repo staat: de I23/I27/I28-incidenten ("groen is geen bewijs")
   en twee blokken over security-by-construction (vertrouwensniveaus,
   host-informatie-redactie).
3. Vijf gerichte **tekstfixes** op bestaande zinnen (introvolgorde, twee te dichte
   kernzinnen, één onduidelijke term, één generiek label) — geen nieuwe secties, geen
   nieuwe knoppen.

## Uitgangspunten uit het gesprek

- **Publiek en toon.** De pagina is overwegend een technisch showcase waar Koen trots op
  is (audiëntie: recruiters, developers, mensen die hem persoonlijk kennen), met een
  stille ondertoon van sollicitatie-bewijsmateriaal voor bedrijven waar hij naar
  solliciteert — maar dat mag niet als pitch lezen en de huidige werkgever hoeft het niet
  als actieve zoektocht te herkennen. Dit schrapt elke vorm van manifest-hero,
  "beschikbaar voor werk"-taal, of een expliciete personal-branding-paragraaf.
- **Geverifieerd, niet aangenomen.** Via `gh api` zijn `README.md` en
  `docs/architectuur.md` van de publieke repo (`github.com/KCTHolman/deSchouwVloot`)
  opgehaald. De I23/I27/I28-tabel, de zin "Groen is geen bewijs", het citaat "Geen enkele
  workflow in deze repo heeft een eigen trigger", de vertrouwensniveaus-tabel
  (untrusted/owner) en de bewuste verwijdering van host-diagnostiek uit de publieke kopie
  staan er letterlijk. Niets van wat hieronder als nieuwe copy staat, is verzonnen.
- **Geen naam-signaal op /werk zelf.** Getoetst met vier mockup-varianten (geen signaal /
  kicker-regel / verweven in de lead / stille regel onderaan) — gekozen: geen signaal. Wie
  het project interessant genoeg vindt, zoekt zelf uit wiens werk het is.
- **Eén globale control, geen sliders per sectie.** Zelfde mentale model als de huidige
  knop: "ik lees nu op niveau X", niet per stap opnieuw kiezen.
- **Kernzinnen blijven vast.** Geen 3 tekstvarianten per stap onderhouden — de slider
  onthult uitsluitend extra blokken, de leeszin zelf verandert niet mee.
- **Naam derde niveau: "Architectuur"**, niet "nerd-modus" — te informeel voor de toon van
  de rest van de site.
- Metriek-denominator ("30,8% van hoeveel runs?") en de telling "zes jobs" bij
  `pr-check.yml` (die in de tekst optelt tot zeven genoemde items) blijven **ongewijzigd** —
  bewuste keuze, geen actie.

## Wat er al staat

`WerkJourney` (`components/werk/werk-journey.tsx`) houdt vandaag `depth` als
`useState<'kern' | 'tech'>('kern')`, gezet via één knop (`dsv-btn--depth`) die toggelt
tussen "Toon de techniek" en "Verberg de techniek". Die waarde gaat als
`data-depth={depth}` op de gezamenlijke wrapper (`kh-werk-copy kh-werk-journey`).

`JourneySection` (`components/werk/journey-section.tsx`) rendert altijd `eyebrow`, `title`
en `lead`. Optionele `tech`/`fail`/`children` gaan samen in één `.dsv-depth-extra`-wikkel
(`hasDepth = Boolean(tech || fail || children)`), die in CSS in zijn geheel aan- of
uitgezet wordt.

In `app/styles/site.css` (rond regel 479) staat de actieve regel:

```css
.dsv-depth-extra { display: none; }
.kh-werk-journey[data-depth="tech"] .dsv-depth-extra { display: block; }

.kh-werk-journey[data-depth="tech"] .dsv-entry-tech,
.kh-werk-journey[data-depth="tech"] .dsv-entry-fail {
  display: block;
}
```

**Let op, buiten scope:** `app/styles/widget.css` bevat rond regel 657-660 eerst een
ongescopede `.dsv-entry-tech, .dsv-entry-fail { display: none; }` — nog actief, want
`widget.css` wordt rechtstreeks geïmporteerd in `app/werk/page.tsx`, en dit is precies wat
`site.css`'s override (regel 482-483) vandaag via hogere specificiteit teniet doet — en
daaronder een tweede, wél dode regel: `.dsv[data-depth="tech"] .dsv-entry-tech { display:
block }`. Er bestaat nergens in de huidige DOM een element met exact class `dsv` dat ook
`data-depth` draagt, dus die scoped override is onbereikbaar — vermoedelijk een restant
uit de periode vóór de React-refactor (zie de koptekst van
`components/showcase/run-data.tsx`: "Dit stond eerder als data-attributen in de HTML, waar
widget.js het weer uit terugleesde"). Dit ontwerp raakt geen van beide regels aan — de
nieuwe CSS in dit ontwerp behoudt hetzelfde override-patroon voor beide tiers. Opruimen
van alleen de tweede regel is een apart, ongerelateerd klusje.

`components/showcase/technisch-data.tsx` exporteert vandaag `METRICS`, `CHECKS` en
`ROADMAP` als losse data-arrays, gerenderd in de checks-`JourneySection` in
`werk-journey.tsx`. De bouwen-sectie bevat op zijn beurt al drie hand-geschreven
`.dsv-runner`-kaarten (impact-analyse, self-hosted-vs-Action, RAG/MCP-eigendom) als losse
kinderen — dat patroon (data-array vóór tabellarische content, inline JSX voor losse
alinea's) hergebruikt dit ontwerp voor de nieuwe content in de checks-sectie.

## Architectuur

### 1. Depth-mechanisme: van binair naar drie standen

```ts
// components/werk/werk-journey.tsx
const DEPTH_LEVELS = ['overzicht', 'techniek', 'architectuur'] as const
type Depth = (typeof DEPTH_LEVELS)[number]

const DEPTH_LABELS: Record<Depth, string> = {
  overzicht: 'Overzicht',
  techniek: 'Techniek',
  architectuur: 'Architectuur',
}
```

`const [depth, setDepth] = useState<Depth>('overzicht')` vervangt de huidige
`'kern' | 'tech'`-state. De knop wordt een `<input type="range">`:

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

Geen overgangsanimatie — zelfde eenvoud als de huidige `display: none/block`-toggle, geen
hoogte- of opacity-transities. Het verklarende paragraafje onder de control
("De kernzinnen hieronder staan er sowieso...") wordt herschreven naar: *"De kernzinnen
staan er sowieso. Deze schuif voegt per stap steeds meer laag toe: eerst de achtergrond,
dan de bewijsvoering erachter."*

### 2. `JourneySection`: nieuwe `deep`-prop, twee tiers in plaats van één

```tsx
// components/werk/journey-section.tsx
type JourneySectionProps = {
  id: string
  eyebrow: string
  title: ReactNode
  lead: ReactNode
  tech?: ReactNode
  fail?: ReactNode
  children?: ReactNode
  deep?: ReactNode   // nieuw: uitsluitend zichtbaar op niveau "architectuur"
}
```

```tsx
{hasDepth ? (
  <div className="dsv-depth-extra" data-tier="techniek">
    {tech ? <p className="dsv-entry-tech">...</p> : null}
    {fail ? <p className="dsv-entry-fail">...</p> : null}
    {children}
  </div>
) : null}

{deep ? (
  <div className="dsv-depth-extra" data-tier="architectuur">
    {deep}
  </div>
) : null}
```

`tech`/`fail`/`children` blijven ongewijzigd zichtbaar vanaf "Techniek" (en dus ook nog bij
"Architectuur" — niets verdwijnt bij verder schuiven). `deep` is exclusief voor
"Architectuur". Van de zes bestaande secties krijgt alleen `checks` (04) een `deep`-prop;
de andere vijf blijven zoals ze zijn.

### 3. CSS: drie standen in plaats van twee

Vervangt de bestaande regel in `site.css` (rond regel 479-485):

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
```

Plus nieuwe, kleine stijlregels voor `.dsv-depth-slider`/`.dsv-depth-labels`/`.is-active`,
gebouwd op de bestaande tokens (`--kh-teal`, `--kh-amber`, `--kh-ash`) — geen nieuwe
kleuren of lettertypes.

## Content: nieuwe Architectuur-laag in de checks-sectie

Twee nieuwe stukken, in deze volgorde (I23/I27/I28 eerst, dan security — beide zijn
gelijkwaardig belangrijk, maar de incidenten-tabel sluit het beste aan op de kernzin van de
sectie zelf, die al over tests en review gaat):

### Blok A — "Groen is geen bewijs" (data-array `INCIDENTS`)

Nieuw in `components/showcase/technisch-data.tsx`, zelfde patroon als `METRICS`:

```ts
export type Incident = { tag: string; symptom: string; lesson: string }

export const INCIDENTS: Incident[] = [
  {
    tag: 'I23',
    symptom: 'de golden-set slaagt',
    lesson:
      'elk geval won met 3-0, dus geen enkel te breed trefwoord kon iets kantelen — de ' +
      'run slaagde voor altijd. Nu moeten grensgevallen met marge 1 winnen.',
  },
  {
    tag: 'I27',
    symptom: 'trigger, pad, naam en permissies allemaal correct',
    lesson:
      'toch tien uur lang geen enkele run — de complete spine lag plat. Nu wordt gemeten ' +
      'of de bron liep én de luisteraar reageerde, niet alleen of de configuratie klopte.',
  },
  {
    tag: 'I28',
    symptom: 'de spine "werkt", niets is rood',
    lesson:
      'een station miste een script bij de consument, draaide fail-closed, en mergede ' +
      'per constructie nooit meer. Nu is dat expliciet getest.',
  },
]
```

Gerenderd onder een korte inleidende zin: *"Groen is geen bewijs. Drie keer stond alles
groen terwijl het systeem feitelijk kapot was — de verdediging is telkens hetzelfde
principe: meet het gedrag, niet de configuratie."* Met een "Bekijk in repo →"-link naar
`README.md` (zelfde stijl als de bestaande `CHECKS`-kaarten).

### Blok B — "Vertrouwensniveaus, geen platte agent" (inline JSX, `.dsv-runner`-kaart)

Zelfde opbouw als de bestaande self-hosted-kaart in de "bouwen"-sectie:

> Untrusted werk (PR- of issue-inhoud van buiten de flow) draait in een sandbox-container
> zonder docker-daemon en zonder host-mounts, nooit met deploy- of domein-secrets in scope,
> en nooit via `pull_request_target` naar een self-hosted runner. Owner-bevoegdheden
> (host-mutaties, releases, registraties) lopen uitsluitend via een apart, expliciet
> gelogd kanaal — nooit vanuit een workflow zelf.

Link naar `docs/architectuur.md` (waar de vertrouwensniveaus-tabel staat).

### Blok C — "Publieke kopie ≠ publieke voordeur" (inline JSX, `.dsv-runner`-kaart)

> De host-diagnostiekworkflow en concrete hostcijfers (RAM, schijf, co-hostende diensten)
> zijn bewust uit deze publieke kopie gehaald: legitiem gereedschap voor de eigenaar, maar
> publiek een kant-en-klare doelwitlijst. Security-denken zit ook in wat je niet laat zien.

Link naar `README.md` (zelfde sectie als Blok A, andere passage).

## Tekstfixes

Vijf bestaande zinnen worden herschreven, geen structurele wijziging:

**a) Intro (`werk-journey.tsx`, `kh-lead`), probleem vóór de naam:**
> Ik bouw zo dat AI-agents het grootste deel van het ontwikkelproces zelfstandig kunnen
> doen, zonder dat ik de controle over het resultaat uit handen geef. deSchouwVloot is de
> gedeelde workflows en standaarden waarop mijn eigen projectrepo's draaien — geen
> productcode, de meeste repo's zelf privé. Van idee tot lancering, in kernzinnen met
> optioneel de techniek erachter: elke bewering hieronder is na te trekken in deze
> publieke repo.

**b) Kernzin "bouwen" (stap 03), ingekort — detail verhuist naar de al bestaande
tech-laag en runner-kaarten, gaat niet verloren:**
> Triage bepaalt wat voor werk het is; plannen toetst het aan mijn vastgelegde grenzen en
> bakent de scope af voordat er iets gebouwd wordt. Bouwen voert dat plan daarna uit op
> een eigen machine, met een limiet — loopt de agent vast, dan stopt hij vanzelf.

**c) Sectie 05, directere zin:**
> Ik grijp maar op drie momenten zelf in: bij de merge van elke fase, bij de release, en
> wanneer een agent escaleert omdat hij er zelf niet uitkomt. Verder nergens — al het
> andere gaat vanzelf door zodra het groen staat.

**d) Sectie 06, "eigen wetgeving" verduidelijkt:**
> ...eigen doelen, een eigen grondwet in zijn constitution.md die de harde grenzen
> vastlegt, eigen aanvullingen op de tests...

**e) Generiek label, twee plekken:** "Huidige AI-projecten" → **"Waar ik momenteel aan
bouw"**, zowel de eyebrow in `werk-journey.tsx` als de CTA-tekst in `home-hero.tsx`
(`Link href="/werk/"`).

CTA-knoppen zelf (hero en footer) blijven ongewijzigd — de belangrijkste
CTA-gerelateerde klacht uit de audits ("Toon de techniek" als knop) vervalt sowieso door
de slider.

## Wat verandert per bestand

- `components/werk/werk-journey.tsx` — depth-state en -UI (slider i.p.v. knop),
  herschreven intro/kernzinnen (a, b, c, d, e), nieuwe `deep`-content op de
  checks-`JourneySection` (Blok A/B/C).
- `components/werk/journey-section.tsx` — nieuwe `deep`-prop, tweede `.dsv-depth-extra`
  met `data-tier="architectuur"`.
- `components/showcase/technisch-data.tsx` — nieuwe export `INCIDENTS` (+ `Incident`-type).
- `app/styles/site.css` — depth-CSS van twee naar drie standen; nieuwe
  `.dsv-depth-slider`/`.dsv-depth-labels`-stijlen.
- `components/home-hero.tsx` — CTA-tekst "Huidige AI-projecten" → "Waar ik momenteel aan
  bouw".

## Buiten scope

- Ronde 2's volledige herstructurering: nieuwe manifest-hero, 11 secties, voor/na-
  stroomdiagrammen, nieuwe homepage-positionering.
- Naam-signaal op /werk zelf (getoetst en afgewezen, zie Uitgangspunten).
- Metriek-denominator bij de 30,8%-dubbele-builds-metric.
- De telling "zes jobs" bij `pr-check.yml` in stap 09/checks — blijft zoals hij staat.
- Herformulering van de repo-CTA's (hero en footer) voorbij de eyebrow/CTA-tekst-rename.
- De dode `.dsv[data-depth="tech"]`-regel in `widget.css` — apart op te ruimen, niet
  gerelateerd aan dit werk.
- Sliders per sectie (afgewezen — één globale control voor de hele pagina).
