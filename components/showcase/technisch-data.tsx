import type { ReactNode } from 'react'

/* De inhoud van de technische weergave. Elke naam hieronder is een echt
   bestand of principe uit de publieke repo, niet gladgestreken voor de show. */

export const REPO = 'https://github.com/KCTHolman/deSchouwVloot'

export type Metric = {
  n: string
  label: string
  fix: string
}

/** Gemeten, niet verzonnen — de nulmeting vóór dit ontwerp. */
export const METRICS: Metric[] = [
  {
    n: '6,2',
    label: 'permission-denials per run',
    fix: '→ opgelost met allowlist-profielen per station',
  },
  {
    n: '18,4%',
    label: 'runs tegen max-turns',
    fix: '→ opgelost met turn-budget per taaktype',
  },
  {
    n: '30,8%',
    label: 'dubbele builds',
    fix: '→ opgelost met concurrency-groepen per subject',
  },
]

export type Check = {
  tag: string
  title: string
  body: ReactNode
  href: string
}

/** De zes controles die elke run bewaken. */
export const CHECKS: Check[] = [
  {
    tag: 'trigger::none',
    title: 'Geen enkele eigen trigger',
    body: 'Alle 16 workflows zijn workflow_call-only, machinaal afgedwongen door een guard-script. Geen issues, geen push, geen schedule — een reusable workflow start nooit vanzelf.',
    href: `${REPO}/blob/main/scripts/check-no-triggers.sh`,
  },
  {
    tag: 'doctor::invariant',
    title: 'fleet-doctor, zes modules',
    body: 'Eén samenhangende invariant-suite — runners, routing, governance, host, flow, consistentie. De doctor rapporteert hard en muteert nooit; mutatie is een bewust gescheiden bevoegdheid.',
    href: `${REPO}/blob/main/scripts/fleet-doctor.sh`,
  },
  {
    tag: 'pin::sha',
    title: 'Gelaagd pin-beleid',
    body: 'Third-party actions op SHA, fleet-refs op @main zolang er één consument is en op SHA of tag zodra de tweede aanhaakt, GitHub-eigen actions op major-tag. Drie soorten vertrouwen, drie soorten pin.',
    href: `${REPO}/blob/main/docs/architectuur.md`,
  },
  {
    tag: 'test::golden',
    title: 'Golden-set regressie',
    body: 'Bevroren echte gevallen naast de unit-tests, inclusief marge-gevallen die met 2-1 moeten winnen — precies de gevallen waar een testset die alles met 3-0 wint, overheen kijkt.',
    href: `${REPO}/blob/main/tests/golden/README.md`,
  },
  {
    tag: 'drift::single-source',
    title: 'Eén bron van waarheid',
    body: 'Bij een eerdere tweede consument groeiden vier gedrifte kopieën — dat kan nu niet meer. Logica leeft precies één keer; een consument krijgt een caller van vijftien regels, nooit een fork.',
    href: `${REPO}/blob/main/docs/architectuur.md`,
  },
  {
    tag: 'lock::subject',
    title: 'Concurrency op het onderwerp',
    body: 'Concurrency-groepen op issue of PR, gestandaardiseerd in de workflow-skeletten. Dubbele builds zaten ooit op 30,8% van de runs — dat patroon is nu structureel onmogelijk.',
    href: `${REPO}/blob/main/docs/architectuur.md`,
  },
]

export type RoadmapEntry = {
  variant: 'now' | 'next'
  tag: string
  title: string
  body: string
}

export const ROADMAP: RoadmapEntry[] = [
  {
    variant: 'now',
    tag: 'VANDAAG',
    title: 'Eén machine, één groot model',
    body: 'De Ubuntu-server praat via OAuth met één gehost model, en elke fleet-workflow wijst nog naar @main — dat mag ook, zolang deSchouwVloot één consument bedient.',
  },
  {
    variant: 'next',
    tag: 'MORGEN',
    title: 'Kleine workers, klein lokaal model',
    body: 'Zodra een tweede consument aanhaakt, wijzen fleet-refs niet langer naar @main maar naar een SHA of tag — en verschuift terugkerend werk naar kleine, lokale workers per taaktype, met het grote model gereserveerd voor architectuur.',
  },
]

export const WORKFLOWS_URL = `${REPO}/tree/main/.github/workflows`

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
