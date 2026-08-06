'use client'

/* ==========================================================================
   De vloot — de scène.

   Alles wat met het canvas te maken heeft: opbouwen, uitmeten, tekenen en
   weer netjes opruimen. De component eromheen (components/fleet.tsx) rendert
   alleen nog het mountpunt en het canvas.

   Reduced motion en telefoonbreedte zitten in de dependencies, dus een omslag
   bouwt de scène vanzelf opnieuw op — dat is wat het origineel met de hand
   deed via een change-listener op de media queries.
   ========================================================================== */

import { useEffect, useRef, type RefObject } from 'react'

import {
  AMBIENT_BOATS,
  COLORS,
  FALLBACK_ACCENTS,
  FIXED_COLORS,
  HERO_BOATS,
  JOURNEY_BOAT,
  JOURNEY_STAGES,
  JOURNEY_STAGE_COUNT,
  LEAD_W,
  NEEDLE_SLOTS,
  RATIO,
  SETTLE,
  SHOWCASE_BOATS,
  SHOWCASE_COMPASS_STAGE,
  SHOWCASE_GEAR_CLUSTER,
  SHOWCASE_GEAR_STAGE,
  SHOWCASE_ROCKET_STAGE,
  SHOWCASE_STAGES,
  SHOWCASE_VLOOT_STAGE,
  TIERS,
  boatDetail,
  buildAmbientDust,
  buildBoat,
  buildJourneyIdentities,
  buildJourneyStage,
  buildRocketPuff,
  deriveFormation,
  ease,
  parseHsl,
  rng,
  type BoatSpec,
  type Particle,
} from '@/lib/fleet-geometry'

export type FleetVariant = 'hero' | 'ambient' | 'journey' | 'showcase' | 'home-compass' | 'home-rocket' | 'home-gear'

/** Een boot op het scherm: de spec plus alles wat per frame of per maat
 *  verandert. */
type Boat = BoatSpec & {
  bobA: number
  bobF: number
  bobP: number
  rockA: number
  rockF: number
  rockP: number
  /** Overstag in plaats van doorvaren — zie de opmerking bij build(). */
  swayA: number
  swayF: number
  swayP: number
  pw: number
  ph: number
  px: number
  py: number
  dx: number
  dy: number
  rot: number
  sin: number
  cos: number
  /** Live, getweende positie/helling — wat er elke frame op het scherm
   *  staat. Begint bij het anker (cx/cy/heel uit de spec) en schuift
   *  daarna naar dcx/dcy/dheel toe. */
  tcx: number
  tcy: number
  theel: number
  /** Doel voor de tween: de vlootformatie van de op dat moment actieve
   *  preset. setFormation() overschrijft dit, nooit iets anders — zie de
   *  toelichting daar voor waarom dat precies de robuustheid is. */
  dcx: number
  dcy: number
  dheel: number
  /** Vaste kant/sterkte van de boog die deze boot vaart tijdens een lange
   *  overtocht (wegvaren/aankomen) — zie de boot-lus in draw(). Bij build()
   *  gezet, per boot verschillend, zodat een vertrekkende vloot niet als één
   *  blok dezelfde kant op zwaait. */
  curveSign: number
  /** Hoe ver "onderweg" deze boot nu is (0 = ligt stil op zijn plek of
   *  anker, oplopend tot 1 midden in een wegvaren/aankomen) — elke frame
   *  herrekend in draw(), gelezen door de deeltjeslus om de jitter tijdens
   *  zo'n overtocht op te voeren. */
  distort: number
  /** Mag deze boot ooit een raketje worden? Alleen de kleine hero-boten
   *  (niet de leidende, niet ambient/journey) — zie de lancering in draw(). */
  canLaunch: boolean
  /** 0 = vaart gewoon, 1 = boot krimpt terwijl het raketje groeit, 2 = het
   *  raketje stijgt en krimpt weg, 3 = de boot groeit terug. */
  launchPhase: 0 | 1 | 2 | 3
  /** Tijdstip (performance.now()) waarop de huidige launchPhase begon. */
  launchStart: number
  /** Rauwe (nog niet geëaset, nog niet per-korrel vertraagde) voortgang van
   *  de huidige launchPhase, 0..1 — fase 1 en 3 lezen dit per deeltje uit,
   *  op dezelfde manier als form/p.lag dat doet bij het invaren. */
  launchRawT: number
  /** Schaal (0..1) waarmee de raket-deeltjes (p.rocket) tijdens de vlucht
   *  (fase 2) hun straal vermenigvuldigen — fase 1/3 rekenen dit zelf uit
   *  per deeltje en negeren dit veld. */
  launchRocketScale: number
  /** Hoeveel het raketje nu al omhoog geschoven is, in pixels. */
  launchRocketRise: number
  /** Eén keer geloot bij het begin van de lancering: teken en sterkte van de
   *  zijwaartse leun, als fractie van de stijghoogte. */
  launchDriftDir: number
  /** Hoeveel het raketje nu al opzij geschoven is, in pixels — dezelfde
   *  tekencurve als launchRocketRise, maal launchDriftDir. */
  launchRocketDriftX: number
  /** Alleen showcase: draairichting tijdens de tandwiel-scène. De "zon"
   *  (boot 0) draait de ene kant op, alle "satellieten" (1–6) de andere —
   *  zo grijpen ze zichtbaar in elkaar, net als een echt tandwielstelsel
   *  waar de satellieten alleen de zon raken, niet elkaar. Ongebruikt voor
   *  hero/ambient/journey. */
  spinDir?: 1 | -1
}

type FleetSceneOptions = {
  mountRef: RefObject<HTMLDivElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  variant: FleetVariant
  /** Stilstaand beeld in plaats van een lopende animatie. */
  frozen: boolean
  narrowScreen: boolean
  coarsePointer: boolean
  /** Aangeroepen zodra er iets te zien is, zodat de laag kan invaren. */
  onSailing: () => void
  /** Alleen variant "journey": scroll-voortgang, 0..JOURNEY_STAGE_COUNT-1.
   *  Een ref, geen prop-waarde — dit verandert elke scroll-frame en mag dus
   *  nooit de effect-dependency zijn die build()/layout() opnieuw triggert.
   *  Hetzelfde principe als pointer.tx/ty hieronder: de container (de ref)
   *  staat stil, de inhoud verandert, draw() leest 'm elke frame vers. */
  progressRef?: RefObject<number>
  /** Alleen variant "journey": true zolang de bezoeker over een
   *  GitHub-link zweeft. Zelfde reden als progressRef: een ref, want dit
   *  wisselt op de muis, niet op React-state. draw() mengt hier zelf naar
   *  toe en weer vanaf — geen aparte animatie-state nodig. */
  githubHoverRef?: RefObject<boolean>
  /** Welke aurora-preset nu actief is (hero/ambient: stuurt de
   *  vlootformatie; journey negeert 'm). Verandert los van de rest — zie
   *  setFormation() hieronder voor waarom dit geen effect-dependency is. */
  presetIndex: number
}

export function useFleetScene({
  mountRef,
  canvasRef,
  variant,
  frozen,
  narrowScreen,
  coarsePointer,
  onSailing,
  progressRef,
  githubHoverRef,
  presetIndex,
}: FleetSceneOptions): void {
  /* setFormation leeft in de grote effect hieronder (het heeft toegang tot
     boats/w/h/draw nodig), maar moet ook oproepbaar zijn vanuit de kleine,
     presetIndex-effect verderop zonder dat die de grote effect meetrekt.
     Een ref bruggen die twee werelden — zie de toelichting bij de kleine
     effect. */
  const sceneRef = useRef<{ setFormation: (index: number, snap: boolean) => void } | null>(null)
  /** Laatst bekende presetIndex, voor onResize — die draait onafhankelijk
   *  van React-renders en kan dus niet zomaar de `presetIndex`-prop lezen. */
  const presetIndexRef = useRef(presetIndex)

  useEffect(() => {
    const mount = mountRef.current
    const canvas = canvasRef.current
    if (!mount || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const specs = variant === 'hero' ? HERO_BOATS : variant === 'ambient' ? AMBIENT_BOATS : []
    /** journey (scroll-gedreven, zie /werk/) en de drie homepage-scènes
     *  hieronder (kompas/tandwiel/raket) delen dezelfde "één evoluerende vorm
     *  uit JOURNEY_STAGES"-opbouw — alleen de bron van de voortgang
     *  verschilt: scroll bij journey, een vaste stand bij de homepage-
     *  scènes. */
    const journeyLike =
      variant === 'journey' || variant === 'home-compass' || variant === 'home-rocket' || variant === 'home-gear'
    /** Iets langer voor de journey-achtige varianten: daar is de vorm het
     *  hele beeld (geen vloot ernaast), dus mag het rustiger op gang komen —
     *  zie entryPos()/de forming-stap in draw() voor de rest van de
     *  "ademende" instap. */
    const formMs = journeyLike ? 2600 : 1800
    /** Alleen relevant voor journeyLike: welk stadium hoort bij de allereerste
     *  tekenbeurt van déze variant. journey start altijd bij de boot (scroll
     *  begint boven), maar de drie homepage-scènes staan meteen op hun eigen,
     *  vaste stadium (zie de rawProgress-toewijzing in draw()) — entryPos()
     *  moet daarom vanaf de JUISTE vorm beginnen, niet altijd vanaf de boot,
     *  anders oogt het laden als "boot verandert na een paar tellen in een
     *  kompas/tandwiel", in plaats van die vorm die zelf scherp wordt. Zelfde
     *  indices als de rawProgress-toewijzing in draw() hieronder (kompas 1,
     *  tandwiel 2, raket het laatste stadium) — JOURNEY_STAGES' eigen
     *  volgorde, niet showcase's afwijkende SHOWCASE_STAGES-volgorde. */
    const initialJourneyStage =
      variant === 'home-compass' ? 1 : variant === 'home-gear' ? 2 : variant === 'home-rocket' ? JOURNEY_STAGE_COUNT - 1 : 0
    /** De drie homepage-alternatieven voor hero, die components/home-
     *  scene.tsx bij het laden loot. Op een telefoon is er geen aparte
     *  tekstkolom naast de vorm (zie de anker-override in build() en de
     *  bredere share hieronder in layout()) — de vorm mag daar groter en
     *  gecentreerd achter de tekst liggen in plaats van rechts ernaast. */
    const soloHomeVariant = variant === 'home-compass' || variant === 'home-rocket' || variant === 'home-gear'

    let w = 0
    let h = 0
    let boats: Boat[] = []
    let parts: Particle[] = []
    /* Alleen showcase: bij welk globale parts-index de deeltjes van elke boot
       beginnen — buildJourneyIdentities() geeft per boot een eigen, lokaal
       genummerde reeks terug, maar layout() moet die deeltjes terugvinden in
       de ene gedeelde parts-array. offset = start van boot b, dus lokale
       index = globale index - offset. */
    let boatParticleStart: number[] = []
    let frame: number | null = null
    let lastFrame = 0
    let lastDraw = 0
    let lastPalette = 0
    /* Eén klok voor alles. requestAnimationFrame levert een tijdstempel op de
       performance-klok aan; wie daar een Date.now() naast legt, rekent met een
       verschil van een halve eeuw en krijgt nooit een animatie die afloopt. */
    let t0 = performance.now()
    let repelR = 0
    let repelPush = 0
    /* Journey, laatste stadium: wanneer de raket volledig gevormd is, begint
       dit op eigen tempo te lopen — geen verdere scroll nodig. Terugscrollen
       zet 'm terug op null, dus scroll blijft de enige bron van waarheid. */
    let liftoffStart: number | null = null
    /* Hoeveel de vorm nu naar het raket-stadium is gemengd, 0..1 — vloeit
       naar de hover-status van een GitHub-link toe in plaats van te
       springen, zowel bij aankomst als bij vertrek. */
    let githubWeight = 0

    /* Hero: op willekeurige tijden wordt één kleine boot even een raketje
       (zie de launch-fase-machine in draw()). nextLaunchAt is null zolang er
       niets te plannen valt (ambient/journey, of frozen); anders het
       performance.now()-tijdstip van de eerstvolgende lancering. -1 op
       launchingBoat betekent: nu even geen enkele boot onderweg. */
    let nextLaunchAt: number | null = null
    let launchingBoat = -1
    /* Duur van in- en uitgroeien (boot naar raket, en later terug), en van de
       vlucht ertussen — traag genoeg om echt te kunnen volgen, niet een knip. */
    const LAUNCH_MORPH_SEC = 1.1
    const LAUNCH_FLIGHT_SEC = 4
    /* Fractie van LAUNCH_MORPH_SEC die de boot al aan het oplossen is vóór
       het raketje voor het eerst een korrel toont — zonder deze vertraging
       staan boot en raket op hetzelfde moment allebei op halve sterkte
       en oogt het als een knipperende ruil in plaats van een overvloeiing. */
    const LAUNCH_STAGGER = 0.25
    /* Zelfde vertragingsvenster als het invaren bij het laden (zie
       p.lag/forming hierboven): elk deeltje krimpt of groeit op een moment
       dat een fractie van LAUNCH_MORPH_SEC na de vorige begint, in plaats
       van als één star blok tegelijk te schakelen. */
    const LAUNCH_LAG_SPAN = 1 - 0.45
    /* Hoe ver een lagging deeltje (hoge p.lag) achterblijft bij de voorkant
       van de raket, in pixels — dat gat is het spoor dat de raket achter
       zich laat. */
    const LAUNCH_TRAIL_PX = 120
    /* Eerste lancering ruim binnen vijf seconden na het laden, zodat het
       effect zich meteen een keer laat zien; daarna is het schaars — negen
       tot achttien seconden tussen twee lanceringen, "niet te druk". */
    const LAUNCH_FIRST_MIN_MS = 2000
    const LAUNCH_FIRST_MAX_MS = 3000
    const LAUNCH_NEXT_MIN_MS = 9000
    const LAUNCH_NEXT_MAX_MS = 18000

    /* Showcase, tandwiel-scène: hoeksnelheid in radialen/seconde — ~0,15 is
       een volle omwenteling in ruim 40 seconden: traag genoeg om als
       zelfverzekerd "draaien" te lezen in plaats van te spinnen. */
    const GEAR_SPIN_SPEED = 0.15
    /* Showcase, raketten-scène: frequentie en amplitude van de doorlopende
       stijg-en-zak-golf. Geen ease-in/ease-out-eenmalige lancering (dat is
       de aparte hero-machine hierboven), maar een cyclus die zolang de
       scène duurt blijft herhalen. */
    const ROCKET_BOB_FREQ = 0.5
    const ROCKET_BOB_AMP_FRAC = 0.05
    /* Homepage, variant "home-rocket": een rustige, eigen lus van opstijgen,
       boven hangen, landen en even stilstaan — geen sinus (die kent geen
       hangtijd) en geen eenmalig vertrek zoals hero's kleine lanceringen.
       Zie homeRocketAltitude() hieronder. 16 seconden voor de volle cyclus
       is traag genoeg om als "landen", niet als "stuiteren" te lezen. */
    const HOME_ROCKET_CYCLE_SEC = 16
    /* Op een telefoon staat de raket al hoog in beeld (zie het anker in
       build()) om onder de tekst te passen — een even hoge stijging als op
       desktop zou de neus dan voorbij de bovenrand duwen. Lager op smalle
       schermen houdt 'm binnen beeld, ook op het hoogste punt van de lus. */
    const HOME_ROCKET_LIFT_FRAC = narrowScreen ? 0.16 : 0.34
    /* Showcase, elke scène-wissel: hoeveel de jitter tijdens het mengen
       (SHOWCASE_BLEND_MS) opzwelt, in het midden van de overgang op zijn
       hoogst en weer terug naar normaal aan beide kanten. Een rechte lerp
       tussen twee heel verschillende silhouetten oogde als een fout, maar te
       fors opzwellen oogde juist weer als kapot — dit is bewust getemperd. */
    const SHOWCASE_TRANS_CHAOS = 0.8
    /* Showcase, kompas-scène: de "zon" mag daar veel groter zijn dan haar
       gewone bootmaat — ze deelt het kompas-moment met niemand (satellieten
       blijven boot), dus mag ze dat moment ook nadrukkelijk domineren.
       Alleen op showcaseCompassWeight, niet op gearWeight: de tandwiel-
       cluster is al zorgvuldig op elkaar afgestemd (de tanden moeten
       raken), dus die maat blijft ongemoeid. */
    const SHOWCASE_SOLO_SCALE = 2.5

    /* Tijdconstante voor de formatie-tween (zie setFormation() en de
       boot-lus in draw()): bij TAU = 2s is een overgave na ~6s voor ~95%
       voltooid, in de buurt van de kleur-blend (BLEND_SEC in lib/aurora.ts).
       Dat tempo past bij een kleine bijstelling van de leidende boot, maar
       voor kleine boten die een heel eind moeten wegvaren of aankomen loopt
       TAU hieronder op tot POS_TAU + EXTRA_TAU — anders is de overtocht
       voorbij voordat je 'm goed en wel ziet vertrekken. */
    const POS_TAU = 2
    const EXTRA_TAU = 3.5
    /* Genormaliseerde afstand (in cx-fracties) waarbij een overtocht als
       "vol onderweg" telt — de meeste boot-tot-parkeerplek-afstanden liggen
       tussen 0.4 en 1.1, dus hier zit een boot al ruim voor de helft van de
       reis op volle boog/jitter. */
    const TRANSIT_SPAN = 0.5
    /* Hoogte van de boog die een varende boot beschrijft, als fractie van de
       canvashoogte — een rechte lijn was precies de klacht. */
    const CURVE_AMP = 0.07
    /* Hoeveel extra de deeltjes-jitter oploopt op volle overtocht: de boot
       "vervormt" onderweg in plaats van als vast blok te verschuiven. */
    const DISTORT_BOOST = 1.4

    const settle = new Array<number>(SETTLE.length)
    const groups: Particle[][] = []
    const groupPhase: number[] = []
    const tierAlpha: number[] = []

    /* x/y: de uitgevlakte stand voor de parallax, als fractie van -1 tot 1.
       px/py: waar de muis nu écht staat, in beeldpunten — het canvas ligt vast
       aan het beeldscherm, dus clientX/clientY zijn hier meteen goed. */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, on: false }

    const palette: [number, number, number][] = [
      [...FALLBACK_ACCENTS[0]],
      [...FALLBACK_ACCENTS[1]],
      [...FALLBACK_ACCENTS[2]],
      [...FIXED_COLORS[0]],
      [...FIXED_COLORS[1]],
      [...FIXED_COLORS[2]],
    ]
    const paletteStr = new Array<string>(COLORS)

    for (let t = 0; t < TIERS; t++) {
      // Niet lineair: de meeste korrels horen in de stille helft thuis, en een
      // handvol mag echt oplichten.
      tierAlpha.push(0.24 + Math.pow(t / (TIERS - 1), 1.35) * 0.72)
    }
    for (let g = 0; g < COLORS * TIERS; g++) {
      groups.push([])
      groupPhase.push((g * 2.399) % (Math.PI * 2))
    }

    /* De aurora zet --t1..--t3 als inline style op <html>, dus dit leest de
       eigenschap rechtstreeks van het element af — getComputedStyle zou hier
       per keer een style-recalc afdwingen voor precies dezelfde drie waarden. */
    function readAccents(): boolean {
      const root = document.documentElement
      let changed = false
      for (let i = 0; i < 3; i++) {
        const hsl = parseHsl(root.style.getPropertyValue(`--t${i + 1}`))
        if (!hsl) continue
        if (palette[i][0] !== hsl[0] || palette[i][1] !== hsl[1] || palette[i][2] !== hsl[2]) {
          palette[i] = hsl
          changed = true
        }
      }
      return changed
    }

    function syncPalette(): void {
      for (let i = 0; i < COLORS; i++) {
        const c = palette[i]
        paletteStr[i] = `hsl(${Math.round(c[0] * 10) / 10},${c[1]}%,${c[2]}%)`
      }
    }

    function measure(): void {
      const rect = mount!.getBoundingClientRect()
      w = Math.max(1, Math.round(rect.width))
      h = Math.max(1, Math.round(rect.height))
    }

    /** Showcase-dichtheid per boot. Boot 0 (de "zon") is de hele tijd het
     *  enige echt dominante silhouet (zie de solo-schaal in draw()) en
     *  verdient dus dezelfde volle dichtheid als de enkele vorm op /werk/ —
     *  geen korting, geen w-afhankelijke afzwakking. Satellieten blijven wél
     *  gekort (ze zijn toch alleen zichtbaar rond de tandwiel-scène).
     *  build() en layout() moeten hier exact dezelfde waarde uit krijgen: het
     *  aantal deeltjes dat buildJourneyIdentities() aanmaakt en het aantal
     *  posities dat buildJourneyStage() teruggeeft moeten één-op-één
     *  overeenkomen, anders schuift de indexering scheef. Vandaar één
     *  gedeelde functie in plaats van de berekening op twee plekken te
     *  herhalen. */
    function showcaseBoatDetail(spec: BoatSpec, index: number): number {
      if (index === 0) return frozen ? 0.5 : 1
      return boatDetail(spec, (frozen ? 0.5 : 1) * 0.7)
    }

    /** Nul snelheid aan beide kanten van een stuk, in plaats van de constante
     *  snelheid van een rechte lerp — dezelfde curve als de kleurblend in
     *  aurora-provider.tsx. homeRocketAltitude() hieronder gebruikt 'm voor
     *  zowel het opstijgen als het landen, zodat geen van beide met een
     *  schok begint of eindigt. */
    function smoothstep(k: number): number {
      const c = Math.min(1, Math.max(0, k))
      return c * c * (3 - 2 * c)
    }

    /** 0..1: hoogte van de home-rocket-vorm boven haar grondpositie, op
     *  moment t (0..1, fractie door HOME_ROCKET_CYCLE_SEC). Vier stukken:
     *  opstijgen, hangen op de top, landen, en een moment stilstaan op de
     *  grond — bewust geen ease-out aan beide kanten (dat gaf een harde
     *  touchdown), maar smoothstep, die net zo zacht landt als vertrekt. */
    function homeRocketAltitude(t: number): number {
      if (t < 0.28) return smoothstep(t / 0.28)
      if (t < 0.46) return 1
      if (t < 0.82) return 1 - smoothstep((t - 0.46) / 0.36)
      return 0
    }

    function build(): void {
      let quality = frozen ? 0.5 : 1
      // Ambient tekent een handvol verre boten tegelijk — dezelfde
      // conservatieve korting als showcase's satellieten, uit hetzelfde
      // prestatie-oogpunt (showcase's eigen dichtheid loopt via
      // showcaseBoatDetail() hierboven, niet via deze `quality`).
      if (variant === 'ambient') quality *= 0.7
      measure()

      parts = []
      boats = []
      boatParticleStart = []
      // build() vervangt de hele boats-array (mount of resize): een lopende
      // lancering wees naar een boot die zo meteen niet meer bestaat.
      launchingBoat = -1

      if (journeyLike) {
        // Eén evoluerende vorm, geen vloot: de lead-shape-deeltjes krijgen hun
        // identiteit hier (vormonafhankelijk); hun positie per stadium komt
        // pas in layout() bij, waar de schaal van het canvas bekend is.
        //
        // Journey's eigen anker (cx 0.8, rechts in beeld) gaat ervan uit dat
        // er een aparte leeskolom naast staat — op /werk/ ligt die er ook
        // altijd, in elk schermformaat. Op de homepage staan tekst en vorm op
        // een telefoon niet naast maar bóven elkaar (zie de narrow-screen
        // regels bij .kh-main--home in site.css, die de tekst naar de
        // onderkant duwen): de vorm hoort dus gecentreerd en in het bovenste
        // deel van het scherm, niet op het middelpunt waar de tekst anders
        // zou overlappen.
        const anchor = soloHomeVariant && narrowScreen ? { ...JOURNEY_BOAT, cx: 0.5, cy: 0.32 } : JOURNEY_BOAT
        boats.push({
          ...anchor,
          bobA: 0,
          bobF: 0.22,
          bobP: 0,
          rockA: 0.014,
          rockF: 0.17,
          rockP: 0,
          swayA: 0,
          swayF: 0.045,
          swayP: 0,
          pw: 0,
          ph: 0,
          px: 0,
          py: 0,
          dx: 0,
          dy: 0,
          rot: 0,
          sin: 0,
          cos: 1,
          // Journey heeft geen formatie (setFormation slaat 'm over): het
          // anker is de enige, onveranderlijke positie.
          tcx: anchor.cx,
          tcy: anchor.cy,
          theel: anchor.heel,
          dcx: anchor.cx,
          dcy: anchor.cy,
          dheel: anchor.heel,
          // Ongebruikt: journey vaart nooit weg/aan (zie de boot-lus in
          // draw(), die slot 0 altijd overslaat).
          curveSign: 1,
          distort: 0,
          // Journey heeft al haar eigen raket-stadium; deze losse lancering
          // is alleen voor hero (zie build() hieronder).
          canLaunch: false,
          launchPhase: 0,
          launchStart: 0,
          launchRawT: 0,
          launchRocketScale: 0,
          launchRocketRise: 0,
          launchDriftDir: 0,
          launchRocketDriftX: 0,
        })

        for (const p of buildJourneyIdentities(quality)) {
          p.boat = 0
          parts.push(p)
        }
      } else if (variant === 'showcase') {
        // Een hele vloot die tegelijk van gedaante wisselt: elke boot krijgt
        // haar eigen journey-achtige deeltjes-identiteit (met een eigen
        // zaad, zie buildJourneyIdentities()'s seed-argument), in plaats van
        // de vaste boot-vorm van buildBoat(). De posities per morph-stadium
        // komen pas in layout() bij, net als bij journey.
        SHOWCASE_BOATS.forEach((spec, b) => {
          boats.push({
            ...spec,
            bobA: 0,
            bobF: 0.22 + (b % 4) * 0.07,
            bobP: b * 1.7,
            rockA: 0.014 + (b % 3) * 0.008,
            rockF: 0.17 + (b % 5) * 0.05,
            rockP: b * 2.3,
            swayA: 0,
            swayF: 0.045 + (b % 5) * 0.011,
            swayP: b * 1.9,
            pw: 0,
            ph: 0,
            px: 0,
            py: 0,
            dx: 0,
            dy: 0,
            rot: 0,
            sin: 0,
            cos: 1,
            tcx: spec.cx,
            tcy: spec.cy,
            theel: spec.heel,
            dcx: spec.cx,
            dcy: spec.cy,
            dheel: spec.heel,
            // Alle zeven boten zijn gelijkwaardig — geen leidende boot zoals
            // bij hero/ambient — dus curveSign volgt hetzelfde om-en-om-
            // patroon als daar, zonder uitzondering voor index 0.
            curveSign: (b % 2 === 0 ? 1 : -1) * (1 + (b % 3) * 0.15),
            distort: 0,
            canLaunch: false,
            launchPhase: 0,
            launchStart: 0,
            launchRawT: 0,
            launchRocketScale: 0,
            launchRocketRise: 0,
            launchDriftDir: 0,
            launchRocketDriftX: 0,
            spinDir: b === 0 ? 1 : -1,
          })

          boatParticleStart[b] = parts.length
          const detail = showcaseBoatDetail(spec, b)
          for (const p of buildJourneyIdentities(detail, b + 1)) {
            p.boat = b
            parts.push(p)
          }
        })
      } else {
        specs.forEach((spec, b) => {
          boats.push({
            ...spec,
            bobA: 0,
            bobF: 0.22 + (b % 4) * 0.07,
            bobP: b * 1.7,
            rockA: 0.014 + (b % 3) * 0.008,
            rockF: 0.17 + (b % 5) * 0.05,
            rockP: b * 2.3,
            /* Overstag in plaats van doorvaren. Eerder voer een boot het beeld
               uit en kwam er aan de andere kant weer in; dat werkte zolang de
               randen wegvaagden, maar nu het canvas doorloopt tot de schermrand
               zou je hem zien verspringen. Een hele trage slinger houdt de
               beweging en laat de vloot bovendien waar hij hoort. */
            swayA: 0,
            swayF: 0.045 + (b % 5) * 0.011,
            swayP: b * 1.9,
            pw: 0,
            ph: 0,
            px: 0,
            py: 0,
            dx: 0,
            dy: 0,
            rot: 0,
            sin: 0,
            cos: 1,
            // Startwaarde is het anker; setFormation() zet dcx/dcy/dheel
            // (en, bij de eerste teken vóór layout(), ook tcx/tcy/theel)
            // meteen naar de dan actieve preset.
            tcx: spec.cx,
            tcy: spec.cy,
            theel: spec.heel,
            dcx: spec.cx,
            dcy: spec.cy,
            dheel: spec.heel,
            // Om en om een andere kant op, met een beetje eigen maat — zo
            // zwaait een vertrekkende vloot niet als één blok dezelfde kant
            // op. Boot 0 (de leidende) gebruikt dit nooit (zie draw()).
            curveSign: (b % 2 === 0 ? 1 : -1) * (1 + (b % 3) * 0.15),
            distort: 0,
            // Alleen de kleine hero-boten (niet de leidende) mogen af en toe
            // een raketje worden — zie de lancering in draw().
            canLaunch: variant === 'hero' && b > 0,
            launchPhase: 0,
            launchStart: 0,
            launchRawT: 0,
            launchRocketScale: 0,
            launchRocketRise: 0,
            launchDriftDir: 0,
            launchRocketDriftX: 0,
          })

          for (const made of buildBoat(spec, b, quality)) {
            made.boat = b
            parts.push(made)
          }

          if (variant === 'hero' && b > 0) {
            for (const made of buildRocketPuff(spec, b, quality)) {
              made.boat = b
              parts.push(made)
            }
          }
        })
      }

      /* Het stof telt per oppervlak, niet per canvas: nu de laag het hele
         scherm beslaat zou een vast aantal op een breed scherm uitdunnen tot
         niets en op een telefoon een korrelig vlak worden. Wel een dak erop,
         want een 4K-scherm hoeft er geen tienduizend te tekenen. */
      const dust = buildAmbientDust(
        Math.min(520, Math.round(((w * h) / (variant === 'ambient' ? 7000 : 4200)) * quality)),
        rng(0x21f3),
      )
      parts.push(...dust)

      for (const group of groups) group.length = 0
      for (const p of parts) groups[p.col * TIERS + p.tier].push(p)
    }

    /** Genormaliseerde vorm naar pixels. Draait bij elke maatverandering
     *  opnieuw; de vorm zelf blijft staan, alleen de schaal verschuift. */
    function layout(): void {
      measure()
      const dpr = Math.min(2, window.devicePixelRatio || 1)

      canvas!.width = Math.round(w * dpr)
      canvas!.height = Math.round(h * dpr)
      canvas!.style.width = `${w}px`
      canvas!.style.height = `${h}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.lineWidth = 1
      ctx!.lineJoin = 'round'

      /* De voorste boot moet in beide richtingen passen mét lucht eromheen —
         op de breedte alleen schalen levert op een laag canvas een boot op
         waarvan de romp onder de rand verdwijnt. Het canvas is nu het hele
         scherm terwijl de boot maar de rechterhelft gebruikt, dus de breedte
         telt voor ongeveer de helft mee. Op een telefoon staat de vloot achter
         de tekst en mag hij het scherm wél vullen. */
      /* Journey staat verder naar rechts en mag daarom smaller blijven: de
         leeskolom is links smaller gemaakt zodat de twee elkaar hooguit
         nipt raken, niet structureel overlappen. Showcase mag juist groter:
         de tekstkolom op /koen-holman/ blijft ruim binnen 600px, en de
         scène hoort nadrukkelijk op te vallen. Het kompas, tandwiel en de
         raket op de homepage zelf mogen nog groter: dat zijn geen bijvangst
         naast de gewone vloot maar het hele-grote alternatief ervoor. Op een
         telefoon staan ze bovenin, boven de tekst (zie de gecentreerde,
         hoger geplaatste anker-override in build()) — daar juist wat
         kleiner dan op desktop, anders is er geen lucht meer over voor de
         tekst eronder en de raket haar eigen stijg-lus. */
      const share = narrowScreen
        ? soloHomeVariant
          ? 0.6
          : 0.78
        : variant === 'journey'
          ? 0.36
          : variant === 'showcase'
            ? 0.5
            : soloHomeVariant
              ? 0.6
              : 0.44
      const lead = Math.min(w * share, (h * 0.62) / RATIO)

      for (const boat of boats) {
        boat.pw = lead * (boat.w / LEAD_W)
        boat.ph = boat.pw * RATIO
        // Live positie, niet het statische anker: draw() neemt dit elke
        // frame over zodra de tween in setFormation() gaat lopen, maar vóór
        // de allereerste teken-frame (o.a. de scatter-naar-binnen-intro
        // hieronder) moet er al een geldige waarde staan.
        boat.px = w * boat.tcx
        boat.py = h * boat.tcy
        boat.bobA = boat.ph * 0.022
        // De voorste boot ligt bijna stil, de verste slingert het meest —
        // hetzelfde principe als bij de helderheid en de korrelgrootte.
        boat.swayA = frozen ? 0 : w * (0.038 - boat.depth * 0.031)
      }

      /* Het bereik van de muis groeit mee met het scherm, maar blijft binnen
         grenzen: te klein en er gebeurt niets zichtbaars, te groot en de hele
         vloot deint mee met elke beweging in plaats van alleen wat je raakt. */
      repelR = Math.max(110, Math.min(230, Math.min(w, h) * 0.19))
      repelPush = repelR * 0.44

      /* Alleen journey: elk stadium (boot t/m raket) vooraf naar boot-lokale
         pixels omgerekend, met dezelfde transform als hierboven. Dit gebeurt
         hier — bij een maatverandering — en niet in draw(), om precies
         dezelfde reden dat bx/by dat ook niet doen: het is duur, en de vorm
         zelf verandert niet tussen twee resizes. */
      const journeyQuality = frozen ? 0.5 : 1
      const journeyStages = journeyLike
        ? JOURNEY_STAGES.map((stage, si) => buildJourneyStage(stage, si, journeyQuality))
        : null

      /* Showcase: hetzelfde idee als journeyStages hierboven, maar per boot —
         elke boot heeft haar eigen dichtheid (zie showcaseBoatDetail() in
         build(), hier hergebruikt zodat de telling exact klopt met wat
         buildJourneyIdentities() daar al heeft aangemaakt) en eigen zaad,
         dus ook haar eigen vooraf uitgerekende stadium-posities. */
      const showcaseStagesByBoat =
        variant === 'showcase'
          ? SHOWCASE_BOATS.map((spec, b) =>
              SHOWCASE_STAGES.map((stage, si) => buildJourneyStage(stage, si, showcaseBoatDetail(spec, b), b + 1)),
            )
          : null

      /* Instap bij het laden. Eerder vloog élke korrel bij het eerste tekenen
         van ver weg naar binnen — een fors "explosie-naar-vorm"-effect, en
         voor de journey-achtige varianten bovendien altíjd vanaf de bootvorm
         (stadium 0) in plaats van de eigen beginvorm, wat op de homepage-
         scènes als een rare "boot verandert na een paar tellen in een
         kompas/tandwiel"-sprong oogde. Nu begint elke korrel vlak bij haar
         eigen, echte beginpositie met een kleine, lokale eigen afwijking —
         geen gericht naar-binnen-vliegen meer — en lost dat op in een paar
         rustige tellen (zie de smoothstep-easing in draw()): een wazige wolk
         die scherp wordt, geen zwerm die van ver komt aanzetten en geen vorm
         die van gedaante lijkt te wisselen. */
      const ENTRY_JITTER_PX = 55
      const ENTRY_SPAN = ENTRY_JITTER_PX * 2 + 1
      function entryPos(i: number, ax: number, ay: number): [number, number] {
        return [ax + (((i * 53) % ENTRY_SPAN) - ENTRY_JITTER_PX), ay + (((i * 29) % ENTRY_SPAN) - ENTRY_JITTER_PX)]
      }

      parts.forEach((p, i) => {
        if (journeyStages && p.boat === 0) {
          const owner = boats[0]
          p.jx = journeyStages.map((pts) => (pts[i][0] - 0.5) * owner.pw)
          p.jy = journeyStages.map((pts) => (pts[i][1] - 0.48) * owner.ph)

          const ax = owner.px + p.jx[initialJourneyStage]
          const ay = owner.py + p.jy[initialJourneyStage]
          ;[p.sx, p.sy] = entryPos(i, ax, ay)
          return
        }

        if (showcaseStagesByBoat && p.boat >= 0) {
          const stages = showcaseStagesByBoat[p.boat]
          const owner = boats[p.boat]
          // Lokale index binnen déze boot: buildJourneyIdentities() nummert
          // elke boot vanaf 0, maar build() heeft ze na elkaar in de ene
          // gedeelde parts-array gezet — boatParticleStart[p.boat] is waar
          // die boot begint.
          const local = i - boatParticleStart[p.boat]
          p.jx = stages.map((pts) => (pts[local][0] - 0.5) * owner.pw)
          p.jy = stages.map((pts) => (pts[local][1] - 0.48) * owner.ph)

          // Showcase's eigen klok begint altijd bij SHOWCASE_VLOOT_STAGE (0,
          // de boot) — zie showcaseStage's beginwaarde in draw() — dus hier
          // is stadium 0 wél de juiste beginvorm, anders dan bij journeyLike.
          const ax = owner.px + p.jx[0]
          const ay = owner.py + p.jy[0]
          ;[p.sx, p.sy] = entryPos(i, ax, ay)
          return
        }

        if (p.boat < 0) {
          p.bx = p.ux * w
          p.by = p.uy * h
        } else {
          const owner = boats[p.boat]
          p.bx = (p.ux - 0.5) * owner.pw
          /* 0.48, niet 0.5: de vorm loopt van masttop (0.03) tot kielwater
             (0.95), dus het optische midden ligt net boven het midden van het
             genormaliseerde vak. */
          p.by = (p.uy - 0.48) * owner.ph
        }
        const ax = p.boat < 0 ? p.bx : boats[p.boat].px + p.bx
        const ay = p.boat < 0 ? p.by : boats[p.boat].py + p.by
        ;[p.sx, p.sy] = entryPos(i, ax, ay)
      })
    }

    /** Straalschaal (0..1) voor één deeltje van een lancerende boot. Fase 1/3
     *  ontleden hier per deeltje aan p.lag — dezelfde staggering als het
     *  invaren bij het laden — zodat de boot oplost en de raket condenseert
     *  in plaats van als twee starre blokken door elkaar te wisselen. Fase 2
     *  blijft boot-breed: de vlucht heeft haar eigen spreiding al via het
     *  spoor (zie de rise/drift-lag hierboven). */
    function launchScale(o: Boat, isRocket: boolean, lag: number): number {
      if (o.launchPhase === 1) {
        if (isRocket) {
          const t = Math.max(0, Math.min(1, (o.launchRawT - LAUNCH_STAGGER) / (1 - LAUNCH_STAGGER)))
          return ease(Math.max(0, Math.min(1, (t - lag) / LAUNCH_LAG_SPAN)))
        }
        return 1 - ease(Math.max(0, Math.min(1, (o.launchRawT - lag) / LAUNCH_LAG_SPAN)))
      }
      if (o.launchPhase === 3) {
        return isRocket ? 0 : ease(Math.max(0, Math.min(1, (o.launchRawT - lag) / LAUNCH_LAG_SPAN)))
      }
      if (o.launchPhase === 2) return isRocket ? o.launchRocketScale : 0
      return isRocket ? 0 : 1
    }

    function draw(now: number): void {
      const elapsed = (now - t0) / 1000
      const form = frozen ? 1 : Math.min(1, (now - t0) / formMs)
      const forming = form < 1
      const time = frozen ? 0 : elapsed
      const repel = pointer.on && !frozen

      /* Hoe hard de veren deze frame aantrekken, gerekend in tijd en niet in
         frames. Anders sluit hetzelfde gat op een trage machine merkbaar
         langzamer dan op een snelle. Het dak van 100 ms vangt de sprong op die
         volgt op een tabblad dat even weg is geweest. */
      const dt = lastDraw ? Math.min(0.1, (now - lastDraw) / 1000) : 0.03
      lastDraw = now
      const pullStir = 1 - Math.exp(-dt / 0.09)
      for (let s = 0; s < SETTLE.length; s++) {
        settle[s] = 1 - Math.exp(-dt / SETTLE[s])
      }

      pointer.x += (pointer.tx - pointer.x) * 0.06
      pointer.y += (pointer.ty - pointer.y) * 0.06

      /* Hero: de losse raket-lancering. Geen scroll of hover stuurt dit, dus
         de klok is de enige bron van waarheid — een geplande tijd die steeds
         opnieuw gezet wordt zodra de vorige lancering afloopt. */
      if (nextLaunchAt !== null) {
        if (launchingBoat < 0 && now >= nextLaunchAt) {
          let candidate = -1
          let seen = 0
          for (let bi = 0; bi < boats.length; bi++) {
            const b = boats[bi]
            // Onderweg of geparkeerd telt niet mee: alleen een boot die al op
            // haar plek ligt, mag even een raketje worden.
            if (!b.canLaunch || b.dcx > 1.1 || Math.abs(b.dcx - b.tcx) > 0.08) continue
            seen++
            if (Math.random() < 1 / seen) candidate = bi
          }
          if (candidate >= 0) {
            launchingBoat = candidate
            boats[candidate].launchPhase = 1
            boats[candidate].launchStart = now
            // Recht omhoog: geen zijwaartse leun.
            boats[candidate].launchDriftDir = 0
          } else {
            // Even geen enkele boot beschikbaar (allemaal onderweg): niet
            // wachten tot de volgende geplande beurt, gewoon snel opnieuw
            // proberen.
            nextLaunchAt = now + 1500
          }
        }

        if (launchingBoat >= 0) {
          const lb = boats[launchingBoat]
          const phaseT = (now - lb.launchStart) / 1000

          if (lb.launchPhase === 1) {
            // Geen boot-brede schaal meer: draw() easet dit per deeltje, met
            // elk deeltje z'n eigen p.lag als vertraging — zie daar voor de
            // reden (dezelfde staggering als het invaren bij het laden).
            lb.launchRawT = Math.min(1, phaseT / LAUNCH_MORPH_SEC)
            lb.launchRocketRise = 0
            lb.launchRocketDriftX = 0
            if (phaseT >= LAUNCH_MORPH_SEC) {
              lb.launchPhase = 2
              lb.launchStart = now
            }
          } else if (lb.launchPhase === 2) {
            const tt = Math.min(1, phaseT / LAUNCH_FLIGHT_SEC)
            // Kwadratisch, geen ease(): een raket vertrekt traag en trekt pas
            // daarna door, in plaats van meteen op volle snelheid te staan.
            const e = tt * tt
            lb.launchRocketRise = e * h * 0.55
            lb.launchRocketDriftX = e * h * 0.55 * lb.launchDriftDir
            lb.launchRocketScale = 1 - e
            if (phaseT >= LAUNCH_FLIGHT_SEC) {
              lb.launchPhase = 3
              lb.launchStart = now
              lb.launchRocketScale = 0
            }
          } else if (lb.launchPhase === 3) {
            lb.launchRawT = Math.min(1, phaseT / LAUNCH_MORPH_SEC)
            if (phaseT >= LAUNCH_MORPH_SEC) {
              lb.launchPhase = 0
              launchingBoat = -1
              nextLaunchAt = now + LAUNCH_NEXT_MIN_MS + Math.random() * (LAUNCH_NEXT_MAX_MS - LAUNCH_NEXT_MIN_MS)
            }
          }
        }
      }

      /* Scroll-voortgang lezen, één keer per frame — niet per deeltje. Onder
         frozen geen lopende interpolatie (t = 0): dan toont het de vorm die
         bij de dichtstbijzijnde sectie hoort, in stappen, niet vloeiend. */
      /* Kompas/tandwiel/raket op de homepage kennen geen scroll: ze staan
         vast op het stadium van hun eigen scène — kompas en tandwiel altijd
         volledig gevormd, de raket altijd op het laatste (raket-)stadium.
         De doorlopende beweging van tandwiel (rotatie) en raket (op-en-neer)
         komt verderop uit een eigen klok, niet uit een stadium-overgang. */
      const rawProgress =
        variant === 'journey'
          ? (progressRef?.current ?? 0)
          : variant === 'home-compass'
            ? 1
            : variant === 'home-gear'
              ? 2
              : variant === 'home-rocket'
                ? JOURNEY_STAGE_COUNT - 1
                : 0
      const clampedProgress = Math.min(JOURNEY_STAGE_COUNT - 1, Math.max(0, rawProgress))
      const journeyStage = Math.min(
        JOURNEY_STAGE_COUNT - 1,
        Math.max(0, frozen ? Math.round(clampedProgress) : Math.floor(clampedProgress)),
      )
      const journeyNext = Math.min(JOURNEY_STAGE_COUNT - 1, journeyStage + 1)
      const journeyT = frozen ? 0 : ease(Math.min(1, Math.max(0, clampedProgress - journeyStage)))

      /* Hoe "kompas" het huidige beeld is — 0 bij de boot, 1 zodra het kompas
         volledig gevormd is. Alleen in dat bereik mag de naald los van de
         kast schommelen; op de boot zou hetzelfde slot (mainsail/jib) er als
         een raar trillend zeil uitzien. */
      const compassStageIndex = 1
      const compassWeight =
        journeyLike
          ? journeyStage === compassStageIndex
            ? 1
            : journeyNext === compassStageIndex
              ? journeyT
              : 0
          : 0
      const needleWobble = frozen || compassWeight <= 0 ? 0 : Math.sin(time * 0.9) * 0.09 * compassWeight
      const needleCos = Math.cos(needleWobble)
      const needleSin = Math.sin(needleWobble)

      /* Hover op een GitHub-link trekt de vorm naar het raket-stadium toe, en
         weer terug bij het verlaten — een vloeiende overgang, geen knip, op
         dezelfde manier als de formatie-tween hierboven. */
      const githubTarget = variant === 'journey' && githubHoverRef?.current ? 1 : 0
      githubWeight += frozen ? githubTarget - githubWeight : (githubTarget - githubWeight) * (1 - Math.exp(-dt / 0.22))
      if (Math.abs(githubWeight - githubTarget) < 0.001) githubWeight = githubTarget

      /* Lancering: pas als de raket het laatste stadium volledig heeft
         bereikt (geen tussenvorm meer), en dan op de klok, niet op progress —
         anders zou verder scrollen nodig zijn om 'm te laten opstijgen. Een
         GitHub-link hoverend telt hetzelfde als daar aangekomen zijn, zodra
         de vorm er grotendeels naartoe gemengd is. */
      const atFinalStage =
        variant === 'journey' && (clampedProgress >= JOURNEY_STAGE_COUNT - 1 - 0.02 || githubWeight > 0.6)
      if (atFinalStage) {
        if (liftoffStart === null) liftoffStart = now
      } else {
        liftoffStart = null
      }
      const liftoffRise = liftoffStart === null ? 0 : (now - liftoffStart) / 1000

      /* Showcase: eigen klok, geen scroll of hover. Elke scène (vloot,
         kompas, raketten, tandwielen) staat SHOWCASE_STAGE_MS lang stil, en
         mengt daarna in SHOWCASE_BLEND_MS naar de volgende — in een lus van
         vier, voor altijd. Onder frozen blijft dit vast op de vlootscène,
         net als hero/ambient/journey daar allemaal hetzelfde
         statische-frame-gedrag voor kennen. */
      const SHOWCASE_STAGE_MS = 12000
      const SHOWCASE_BLEND_MS = 1200
      let showcaseStage = 0
      let showcaseNext = 0
      let showcaseT = 0
      /* Voortgang door de huidige hold, 0..1 — los van showcaseT (dat is
         alleen de overgang erna). Stuurt de kompas-chaos hieronder: rustig
         het grootste deel van de hold, pas op hol tegen het einde. */
      let showcaseHoldT = 0
      if (variant === 'showcase' && !frozen) {
        const period = SHOWCASE_STAGE_MS + SHOWCASE_BLEND_MS
        const cycle = period * SHOWCASE_STAGES.length
        const pos = (now - t0) % cycle
        showcaseStage = Math.floor(pos / period)
        showcaseNext = (showcaseStage + 1) % SHOWCASE_STAGES.length
        const within = pos - showcaseStage * period
        showcaseT = within <= SHOWCASE_STAGE_MS ? 0 : ease(Math.min(1, (within - SHOWCASE_STAGE_MS) / SHOWCASE_BLEND_MS))
        showcaseHoldT = Math.min(1, within / SHOWCASE_STAGE_MS)
      }
      /* Hoe "raket"/"tandwiel" de huidige scène is, 0..1 — dezelfde soort
         gewicht als compassWeight hierboven, nu voor de twee showcase-scènes
         die een eigen doorlopende beweging krijgen (stijg-en-zak-lus,
         respectievelijk continue rotatie) in plaats van alleen een vaste
         eindvorm. `1 - showcaseT` zolang de scène zelf actief is: dat gewicht
         moet net zo goed aflopen tijdens het wegmengen naar de volgende scène
         als het opliep tijdens het inmengen ervan — anders blijft bijvoorbeeld
         de raket-bob op volle sterkte doorlopen terwijl de vorm al aan het
         tandwiel wordt, en dat gaf precies het soort verspringing dat de
         kompas-naaldrotatie (zie showcaseCompassWeight) ook al had. */
      const rocketWeight =
        variant !== 'showcase'
          ? 0
          : showcaseStage === SHOWCASE_ROCKET_STAGE
            ? 1 - showcaseT
            : showcaseNext === SHOWCASE_ROCKET_STAGE
              ? showcaseT
              : 0
      const gearWeight =
        variant !== 'showcase'
          ? 0
          : showcaseStage === SHOWCASE_GEAR_STAGE
            ? 1 - showcaseT
            : showcaseNext === SHOWCASE_GEAR_STAGE
              ? showcaseT
              : 0
      const gearSpinBase = time * GEAR_SPIN_SPEED

      /* Kompas: alleen boot 0 (de "zon") wordt ooit een kompas — satellieten
         slaan deze scène over (zie de per-boot stage-remap in de deeltjeslus
         hieronder) en blijven gewoon boot. showcaseCompassWeight is dus
         alleen relevant voor boot 0. Zelfde `1 - showcaseT`-reden als
         hierboven: zonder die aftopping bleef de naald-rotatie op volle
         sterkte staan terwijl de vorm al naar de raket-vinnen (dezelfde
         sloties als de naald) aan het overvloeien was — de "vleugels
         verspringen"-glitch die daarvan kwam. */
      const showcaseCompassWeight =
        variant !== 'showcase'
          ? 0
          : showcaseStage === SHOWCASE_COMPASS_STAGE
            ? 1 - showcaseT
            : showcaseNext === SHOWCASE_COMPASS_STAGE
              ? showcaseT
              : 0
      // Rustige, gelijkmatige schommeling — geen chaos-fase meer.
      const showcaseNeedleWobble = frozen || showcaseCompassWeight <= 0 ? 0 : Math.sin(time * 0.9) * 0.09 * showcaseCompassWeight
      const showcaseNeedleCos = Math.cos(showcaseNeedleWobble)
      const showcaseNeedleSin = Math.sin(showcaseNeedleWobble)

      /* Showcase-boten hebben geen aurora-preset-formatie (zie setFormation()
         hieronder, die de aanroep net als journey negeert): hun positie komt
         hier zelf, elke frame opnieuw, als een lerp tussen de gewone
         vlootpositie en de tandwiel-cluster naarmate gearWeight oploopt.
         Direct op tcx/tcy/theel gezet, niet via de gewone dcx/dcy-tween
         hieronder: die tween heeft haar eigen, langzamere inlooptijd
         (POS_TAU/EXTRA_TAU, seconden), los van gearWeight — daardoor bleef
         de boot nog naar haar plek "invaren" nadat de vorm allang weer een
         boot was. gearWeight (afgeleid van dezelfde showcaseT als de
         vorm-morph) is zelf al de juiste, gesynchroniseerde easing. */
      if (variant === 'showcase') {
        for (let bi = 0; bi < boats.length; bi++) {
          const anchor = SHOWCASE_BOATS[bi]
          const cluster = SHOWCASE_GEAR_CLUSTER[bi]
          const boat = boats[bi]
          const cx = anchor.cx + (cluster.cx - anchor.cx) * gearWeight
          const cy = anchor.cy + (cluster.cy - anchor.cy) * gearWeight
          const heel = anchor.heel + (cluster.heel - anchor.heel) * gearWeight
          boat.dcx = cx
          boat.dcy = cy
          boat.dheel = heel
          boat.tcx = cx
          boat.tcy = cy
          boat.theel = heel
        }
      }

      for (let bi = 0; bi < boats.length; bi++) {
        const boat = boats[bi]

        /* Hoe ver deze boot nog van haar doel af staat, in cx-fracties: 0
           voor de leidende boot (die schuift altijd rechtstreeks bij, geen
           boog/vervorming — "verplaatsen", geen "wegvaren") en voor een boot
           die al (bijna) op haar plek of geparkeerd staat, oplopend naar 1
           voor een boot die nog een heel eind moet wegvaren of aankomen.
           Showcase heeft geen leidende boot — alle zeven zijn gelijkwaardig
           en mogen dus allemaal de boog/vervorming krijgen zodra ze naar de
           tandwiel-cluster (of terug) bewegen. */
        const remain = bi === 0 && variant !== 'showcase' ? 0 : Math.abs(boat.dcx - boat.tcx)
        const transit = Math.min(1, remain / TRANSIT_SPAN)
        boat.distort = transit

        /* Trager naarmate er meer overtocht te gaan is: dat is precies het
           "te snel"-gevoel dat een vaste TAU voor elke verplaatsing gaf. */
        const tau = POS_TAU + EXTRA_TAU * transit
        const lerp = 1 - Math.exp(-dt / tau)

        // Naar het doel toe schuiven, niet ernaartoe springen: dcx/dcy/dheel
        // is het enige dat setFormation() ooit aanraakt, dus een nieuwe
        // preset-klik buigt de tween gewoon bij vanaf hier — geen wachtrij.
        boat.tcx += (boat.dcx - boat.tcx) * lerp
        boat.tcy += (boat.dcy - boat.tcy) * lerp
        boat.theel += (boat.dheel - boat.theel) * lerp
        boat.px = w * boat.tcx
        boat.py = h * boat.tcy

        /* De boog: nul bij vertrek en bij aankomst, op zijn breedst
           halverwege — een boot die wegvaart of invaart volgt zo een
           gebogen pad in plaats van kaarsrecht cx te veranderen. */
        const bulge = transit <= 0 ? 0 : Math.sin(Math.PI * transit)

        boat.dy =
          Math.sin(time * boat.bobF + boat.bobP) * boat.bobA +
          pointer.y * boat.par * 8 +
          boat.curveSign * CURVE_AMP * h * bulge

        // Home-rocket: rigide op- en neerbeweging bovenop de gewone
        // deining, één waarde voor de hele vorm (niet per korrel zoals
        // hero's lancering) — de raket blijft zo altijd herkenbaar één
        // silhouet, ook halverwege het opstijgen of landen.
        if (variant === 'home-rocket' && !frozen) {
          const cyclePos = (time % HOME_ROCKET_CYCLE_SEC) / HOME_ROCKET_CYCLE_SEC
          boat.dy -= homeRocketAltitude(cyclePos) * h * HOME_ROCKET_LIFT_FRAC
        }

        boat.rot = boat.theel + Math.sin(time * boat.rockF + boat.rockP) * boat.rockA
        boat.sin = Math.sin(boat.rot)
        boat.cos = Math.cos(boat.rot)

        // Elke frame opnieuw uit de tijd gerekend, niet opgeteld: opgeteld
        // loopt de boot weg zodra er een frame overslaat.
        boat.dx = Math.sin(time * boat.swayF + boat.swayP) * boat.swayA + pointer.x * boat.par * 12
      }

      ctx!.clearRect(0, 0, w, h)

      for (let g = 0; g < groups.length; g++) {
        const list = groups[g]
        if (!list.length) continue

        /* Eén puls per groep in plaats van per korrel: de groepen liggen
           kriskras door de vloot, dus je ziet een veld dat ademt en niet een
           aantal vlakken dat samen aan- en uitgaat. */
        const pulse = frozen ? 1 : 0.7 + 0.3 * Math.sin(time * 0.7 + groupPhase[g])
        ctx!.globalAlpha = tierAlpha[g % TIERS] * pulse
        ctx!.strokeStyle = paletteStr[(g / TIERS) | 0]
        ctx!.beginPath()

        for (const p of list) {
          let x: number
          let y: number
          // Hoe "vervormd" deze korrel oogt: alleen een boot-eigen boot heeft
          // een distort-waarde, los stof (p.boat < 0) blijft er gewoon buiten.
          let distort = 0

          if (p.boat < 0) {
            x = p.bx + (p.vx ? p.vx * time : 0)
            y = p.by
            x = ((x % w) + w) % w
          } else if (p.jx && p.jy) {
            // Journey: bx/by is geen vaste waarde maar een lerp tussen het
            // huidige en het volgende vorm-stadium — de rest van de pijplijn
            // hieronder (deining, jitter, opbouw, muis) is identiek aan hoe
            // hero/ambient een boot tekenen.
            const o = boats[p.boat]
            // Showcase heeft zijn eigen scène-klok (vier stadia, zie
            // hierboven) in plaats van journey's scroll-voortgang (zes
            // stadia) — verder is dit exact dezelfde lerp-tussen-twee-
            // vormen-truc. Alleen boot 0 (de "zon") gaat ooit door de
            // kompas-scène; elke andere boot slaat 'm over en blijft gewoon
            // boot, dus die remapt SHOWCASE_COMPASS_STAGE naar
            // SHOWCASE_VLOOT_STAGE — "er hoeft er maar één van te zijn".
            const stageIdx =
              variant !== 'showcase'
                ? journeyStage
                : p.boat === 0 || showcaseStage !== SHOWCASE_COMPASS_STAGE
                  ? showcaseStage
                  : SHOWCASE_VLOOT_STAGE
            const nextIdx =
              variant !== 'showcase'
                ? journeyNext
                : p.boat === 0 || showcaseNext !== SHOWCASE_COMPASS_STAGE
                  ? showcaseNext
                  : SHOWCASE_VLOOT_STAGE
            const stageT = variant === 'showcase' ? showcaseT : journeyT
            let bx = p.jx[stageIdx] + (p.jx[nextIdx] - p.jx[stageIdx]) * stageT
            let by = p.jy[stageIdx] + (p.jy[nextIdx] - p.jy[stageIdx]) * stageT

            // De zon is het enige zichtbare silhouet in elke scène — vloot,
            // kompas, raket én tandwiel (satellieten blijven nu altijd
            // onzichtbaar, zie de straal-schaling verderop) — en mag dus
            // overal even fors groter zijn dan haar gewone bootmaat.
            if (variant === 'showcase' && p.boat === 0) {
              bx *= 1 + SHOWCASE_SOLO_SCALE
              by *= 1 + SHOWCASE_SOLO_SCALE
            }

            // De naald draait om de as (boot-lokale oorsprong), los van kast
            // en tikken — dezelfde reden dat het kompas 0.48 als middelpunt
            // koos: dat valt hier al samen met (0, 0). Showcase heeft zijn
            // eigen wobble (met de kompas-chaos erin) en geldt alleen voor
            // boot 0 — journey heeft toch al maar één boot, dus de
            // p.boat === 0-voorwaarde verandert daar niets.
            const activeWobble = variant === 'showcase' ? showcaseNeedleWobble : needleWobble
            if (activeWobble !== 0 && p.boat === 0 && p.slot !== undefined && NEEDLE_SLOTS.includes(p.slot)) {
              const nc = variant === 'showcase' ? showcaseNeedleCos : needleCos
              const ns = variant === 'showcase' ? showcaseNeedleSin : needleSin
              const wx = bx * nc - by * ns
              const wy = bx * ns + by * nc
              bx = wx
              by = wy
            }

            // Hover trekt naar het raket-stadium toe, geleidelijk: bij
            // githubWeight 0 verandert hier niets, bij 1 staat de volledige
            // raket er, alles ertussen is een rechte lerp naar dat doel.
            if (githubWeight > 0) {
              const rocketIndex = JOURNEY_STAGE_COUNT - 1
              bx += (p.jx[rocketIndex] - bx) * githubWeight
              by += (p.jy[rocketIndex] - by) * githubWeight
            }

            // Showcase, tandwiel-scène: doorlopende rotatie om de eigen as
            // van de boot, vóór de boot-transform hieronder — de "zon"
            // (spinDir 1) en de "satellieten" (spinDir -1) draaien
            // tegengesteld, zodat ze zichtbaar in elkaar grijpen. gearWeight
            // laat dit geleidelijk intreden/uittreden met de morph zelf, in
            // plaats van abrupt te beginnen te draaien op een nog half
            // boot-vormige wolk.
            if (variant === 'showcase' && gearWeight > 0) {
              const spin = gearSpinBase * (o.spinDir ?? 1) * gearWeight
              const sc = Math.cos(spin)
              const ss = Math.sin(spin)
              const rx = bx * sc - by * ss
              const ry = bx * ss + by * sc
              bx = rx
              by = ry
            }

            // Home-gear: hetzelfde idee als showcase's tandwiel hierboven,
            // maar voor één vast tandwiel op volle sterkte (geen gearWeight
            // dat op- of afbouwt) — onder frozen staat 'm stil op hoek 0 in
            // plaats van op een willekeurige hoek te blijven hangen.
            if (variant === 'home-gear' && !frozen) {
              const spin = gearSpinBase
              const sc = Math.cos(spin)
              const ss = Math.sin(spin)
              const rx = bx * sc - by * ss
              const ry = bx * ss + by * sc
              bx = rx
              by = ry
            }

            x = o.px + o.dx + bx * o.cos - by * o.sin
            y = o.py + o.dy + bx * o.sin + by * o.cos

            // Elke korrel heeft z'n eigen stijgsnelheid (vy), dus de vloot
            // rafelt uiteen terwijl hij wegdrijft in plaats van als één blok
            // omhoog te schuiven.
            if (liftoffRise > 0) y -= liftoffRise * (p.vy ?? 70)

            // Showcase, raketten-scène: geen eenmalig vertrek (dat is de
            // aparte hero-lancering hierboven), maar een doorlopende
            // stijg-en-zak-golf zolang deze scène duurt — elke boot op haar
            // eigen fase (bobP), zodat de "lading" niet als één blok
            // synchroon beweegt.
            if (variant === 'showcase' && rocketWeight > 0) {
              const riseWave = (1 - Math.cos(time * ROCKET_BOB_FREQ + o.bobP)) * 0.5
              y -= riseWave * h * ROCKET_BOB_AMP_FRAC * rocketWeight * (0.6 + (p.vy ?? 70) / 140)
            }
          } else {
            const o = boats[p.boat]
            x = o.px + o.dx + p.bx * o.cos - p.by * o.sin
            y = o.py + o.dy + p.bx * o.sin + p.by * o.cos
            distort = o.distort
            if (p.rocket) {
              // Elk deeltje heeft al een eigen p.lag (0..0.45) — hergebruikt
              // hier als achterstand op de voorkant van de raket, dus de
              // wolk rekt uit tot een spoor in plaats van als één blok te
              // stijgen. Dicht bij de voorkant (lage lag) volgt bijna meteen;
              // ver naar achteren (hoge lag) blijft een tijd op de oude plek
              // hangen voor het meetrekt.
              const localRise = Math.max(0, o.launchRocketRise - p.lag * LAUNCH_TRAIL_PX)
              const frac = o.launchRocketRise > 0 ? localRise / o.launchRocketRise : 0
              y -= localRise
              x += o.launchRocketDriftX * frac
            }
          }

          if (!frozen) {
            // Op volle overtocht buigt de jitter fors op: de boot oogt
            // onderweg als een korrelige, kokende wolk in plaats van een
            // vast blokje dat over de rail schuift. Showcase krijgt daar
            // een tweede, eigen reden bovenop: tijdens elke scène-wissel
            // zwelt de jitter op tot een piek halverwege het mengen en zakt
            // daarna weer terug — de vorm valt zichtbaar uiteen en komt
            // weer samen, in plaats van recht van de ene naar de andere
            // vorm te lerpen.
            const showcaseTransBoost =
              variant === 'showcase' ? 1 + 4 * showcaseT * (1 - showcaseT) * SHOWCASE_TRANS_CHAOS : 1
            const ja = p.ja * (1 + distort * DISTORT_BOOST) * showcaseTransBoost
            x += Math.sin(time * p.jf + p.jp) * ja
            y += Math.cos(time * p.jf * 0.8 + p.jp) * ja * 0.7
          }

          if (forming) {
            // smoothstep, geen ease(): die laatste trekt hard van start (drie
            // kwart van de reis zit al in de eerste helft van de tijd), en
            // dat is precies het "snelle sprong"-gevoel dat hier niet meer
            // moet. smoothstep begint en eindigt allebei traag — de korrel
            // komt tot rust in plaats van af te remmen uit volle vaart.
            const e = smoothstep((form - p.lag) / (1 - 0.45))
            x = p.sx + (x - p.sx) * e
            y = p.sy + (y - p.sy) * e
          }

          /* De muis roert door het veld. Drie delen, en de verhouding ertussen
             is het hele punt:
               draaiing  loodrecht op de cursor, voor alle korrels dezelfde
                         kant op — dat leest als roeren.
               eigenzin  elke korrel heeft z'n eigen richting, dus buren gaan
                         uit elkaar in plaats van samen opzij. Dit is wat het
                         wanorde maakt en geen verschuiving.
               afstoting klein gehouden. Een flinke radiale duw veegt de boel
                         uit een cirkel weg en laat een gat achter; daar is het
                         niet om te doen. */
          let tox = 0
          let toy = 0
          let hit = false
          if (repel) {
            const rdx = x - pointer.px
            const rdy = y - pointer.py
            const d2 = rdx * rdx + rdy * rdy
            if (d2 < repelR * repelR) {
              hit = true
              const d = Math.sqrt(d2) || 0.001
              const k = 1 - d / repelR
              /* k * (2 - k), niet k in het kwadraat: dat laatste stopt bijna
                 alle beweging in de paar korrels pal onder de cursor, en dan
                 gebeurt er zichtbaar niets. */
              const f = repelPush * k * (2 - k) * p.grip
              const ux = rdx / d
              const uy = rdy / d
              /* De eigen richting draait langzaam mee zolang de cursor er
                 staat, zodat het blijft borrelen in plaats van te bevriezen in
                 één verstoorde stand. */
              const a = p.chaos + time * 0.5
              tox = (ux * 0.18 - uy * 0.6 + Math.cos(a) * 0.8) * f
              toy = (uy * 0.18 + ux * 0.6 + Math.sin(a) * 0.8) * f
            }
          }
          /* In de war raken gaat snel en voor iedereen even snel; terugvinden
             gaat traag en voor elke korrel anders. Dat verschil is precies waar
             je naar kijkt. */
          const pull = hit ? pullStir : settle[p.traag]
          p.ox += (tox - p.ox) * pull
          p.oy += (toy - p.oy) * pull
          x += p.ox
          y += p.oy

          // Geen aparte alpha-fade (die zou de per-groep gebundelde stroke()
          // breken) — de lancering schaalt in plaats daarvan de straal: 0 is
          // onzichtbaar, 1 is normaal. Het gewone geval (launchPhase 0, geen
          // enkele boot aan het lanceren) slaat launchScale() over — geen
          // functie-aanroep voor elk deeltje zolang er niets te doen is.
          let r: number
          if (p.boat < 0) {
            r = p.r
          } else {
            const lo = boats[p.boat]
            r = lo.launchPhase === 0 ? (p.rocket ? 0 : p.r) : p.r * launchScale(lo, !!p.rocket, p.lag)
            // Showcase: de zon is in elke scène het enige zichtbare
            // silhouet, ook bij de tandwielen — "1 tandwiel, even groot als
            // de andere" in plaats van een zon-met-satellieten-cluster.
            // Satellieten blijven dus altijd onzichtbaar.
            if (variant === 'showcase' && p.boat !== 0) {
              r = 0
            }
          }
          if (r <= 0.02) continue
          const a = p.spin + (frozen ? 0 : time * 0.08)
          ctx!.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
          ctx!.lineTo(x + Math.cos(a + 2.0944) * r, y + Math.sin(a + 2.0944) * r)
          ctx!.lineTo(x + Math.cos(a + 4.1888) * r, y + Math.sin(a + 4.1888) * r)
          ctx!.closePath()
        }

        ctx!.stroke()
      }

      ctx!.globalAlpha = 1
    }

    /** Zet het doel voor elke boot naar de formatie van preset `index`.
     *  Overschrijft alleen dcx/dcy/dheel — geen wachtrij, geen animatie die
     *  hier zelf afspeelt. Bij `snap` (mount, resize, of altijd zodra
     *  `frozen`) springt tcx/tcy/theel meteen mee in plaats van in te lopen;
     *  layout() en draw() rekenen px/py daar zelf weer uit, dus die hoeven
     *  hier niet aangeraakt. Journey heeft geen formatie en negeert de
     *  aanroep; showcase evenmin — die stelt dcx/dcy/dheel zelf, elke frame,
     *  in draw() (vlootpositie versus tandwiel-cluster, zie gearWeight). */
    function setFormation(index: number, snap: boolean): void {
      if (journeyLike || variant === 'showcase') return

      const formation = deriveFormation(index, variant)
      const doSnap = snap || frozen

      formation.forEach((slot, i) => {
        const boat = boats[i]
        if (!boat) return

        boat.dcx = slot.cx
        boat.dcy = slot.cy
        boat.dheel = slot.heel

        if (doSnap) {
          boat.tcx = slot.cx
          boat.tcy = slot.cy
          boat.theel = slot.heel
        }
      })

      /* Bij mount/resize tekent de aanroepende code toch al meteen opnieuw
         (layout() gevolgd door sync(), of de resize-handler hieronder) — een
         extra draw() hier zou dat gewoon dubbel doen. Alleen onder frozen
         draait er niets vanzelf door: dan moet setFormation() zelf voor het
         zichtbare resultaat zorgen. */
      if (frozen) draw(t0 + formMs + 1)
    }

    sceneRef.current = { setFormation }

    function loop(now: number): void {
      /* Tijdens de opbouw op volle snelheid, daarna rond de 30 beelden per
         seconde: het is een deinende achtergrond, geen animatie waar iemand
         naar zit te kijken. Journey is dat wél — die vorm hoort direct op
         scroll te reageren, dus die tekent elk frame, anders loopt de morph
         achter de scrollpositie aan en voelt het schokkerig. Showcase heeft
         geen scroll, maar wél een doorlopende rotatie en stijg-golf die op
         30fps zichtbaar zou hakkelen, dus tekent die om dezelfde reden elk
         frame. */
      const forming = now - t0 < formMs
      const frameGap = journeyLike || variant === 'showcase' ? 0 : 30
      if (forming || now - lastFrame >= frameGap) {
        lastFrame = now
        if (now - lastPalette >= 220) {
          lastPalette = now
          if (readAccents()) syncPalette()
        }
        draw(now)
      }
      frame = requestAnimationFrame(loop)
    }

    function shouldAnimate(): boolean {
      /* Journey blijft doortekenen onder frozen — niet om te bewegen (draw()
         zet jitter/deining/opbouw allemaal op nul zodra frozen), maar omdat
         de vorm zelf per sectie verandert terwijl er gescrold wordt. Zonder
         een lopende lus zou reduced-motion na de eerste tekening voor altijd
         op de boot blijven staan, ook diep in het schild-hoofdstuk. */
      if (variant === 'journey') return document.visibilityState !== 'hidden'
      return !frozen && document.visibilityState !== 'hidden'
    }

    function sync(): void {
      if (frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      if (shouldAnimate()) {
        /* Terug van een verborgen tabblad: sommige browsers ruimen de
           canvas-buffer op zodra hij een tijd niet zichtbaar was, met een
           leeg canvas tot gevolg dat pas bij de eerstvolgende resize weer
           gevuld raakt. layout() zet canvas.width/height opnieuw — dat
           dwingt een verse buffer af — zonder de vloot zelf te laten
           overnieuw invaren, want t0 ligt allang voorbij formMs. */
        layout()
        frame = requestAnimationFrame(loop)
      } else {
        syncPalette()
        draw(t0 + formMs + 1)
      }
    }

    /* ---------- reageren op de omgeving ---------------------------------- */

    let resizeTimer: number | undefined
    function onResize(): void {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        /* Opnieuw opbouwen én uitmeten: het aantal stofkorrels hangt aan het
           oppervlak, dus een ander formaat vraagt een andere vulling. De zaden
           liggen vast, dus de boten zelf blijven exact dezelfde. */
        build()
        // Snapt naar de laatst bekende preset: een resize herschikt toch al
        // alles, dus een lopende tween door de herbouw heen bewaren heeft
        // geen zin.
        setFormation(presetIndexRef.current, true)
        layout()
        if (!shouldAnimate()) draw(t0 + formMs + 1)
      }, 160)
    }

    const observer = new ResizeObserver(onResize)
    observer.observe(mount)

    function onPointerMove(e: PointerEvent): void {
      if (e.pointerType === 'touch') return
      pointer.px = e.clientX
      pointer.py = e.clientY
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2
      pointer.on = true
    }

    /* Muis het venster uit: het gat trekt weer dicht. Zonder dit blijft de
       laatste stand staan tot de muis terugkomt. */
    function releasePointer(): void {
      pointer.on = false
    }

    /* Alleen waar er een echte aanwijzer is. Op een aanraakscherm zou de
       laatste tik een gat in de vloot achterlaten dat er blijft staan. */
    if (!coarsePointer) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      document.addEventListener('pointerleave', releasePointer)
      document.addEventListener('pointercancel', releasePointer)
      window.addEventListener('blur', releasePointer)
    }

    document.addEventListener('visibilitychange', sync)

    readAccents()
    syncPalette()
    build()
    setFormation(presetIndexRef.current, true)
    layout()
    t0 = performance.now()
    // Alleen hero plant een lancering; ambient/journey en frozen (reduced
    // motion, telefoon) blijven op null staan, dus draw() slaat de hele
    // launch-machine dan over.
    nextLaunchAt =
      variant === 'hero' && !frozen
        ? t0 + LAUNCH_FIRST_MIN_MS + Math.random() * (LAUNCH_FIRST_MAX_MS - LAUNCH_FIRST_MIN_MS)
        : null
    sync()
    onSailing()

    return () => {
      sceneRef.current = null
      observer.disconnect()
      window.clearTimeout(resizeTimer)
      document.removeEventListener('visibilitychange', sync)
      if (!coarsePointer) {
        window.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerleave', releasePointer)
        document.removeEventListener('pointercancel', releasePointer)
        window.removeEventListener('blur', releasePointer)
      }
      if (frame !== null) cancelAnimationFrame(frame)
    }
    /* presetIndex leest deze effect nergens rechtstreeks (alleen via de
       stabiele presetIndexRef), dus hoort ook niet in de dependency-lijst: een
       preset-klik mag nooit de hele scène (canvas, deeltjes, muisstaat)
       opnieuw opbouwen. De kleine effect hieronder zet het nieuwe doel via
       setFormation(), zonder dit effect te raken. */
  }, [canvasRef, coarsePointer, frozen, mountRef, narrowScreen, onSailing, progressRef, variant])

  useEffect(() => {
    presetIndexRef.current = presetIndex
    sceneRef.current?.setFormation(presetIndex, false)
  }, [presetIndex])
}
