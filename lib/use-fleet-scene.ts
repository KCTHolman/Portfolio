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
  TIERS,
  buildAmbientDust,
  buildBoat,
  buildJourneyIdentities,
  buildJourneyStage,
  deriveFormation,
  ease,
  parseHsl,
  rng,
  type BoatSpec,
  type Particle,
} from '@/lib/fleet-geometry'

export type FleetVariant = 'hero' | 'ambient' | 'journey'

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
    const formMs = variant === 'journey' ? 2400 : 1500

    let w = 0
    let h = 0
    let boats: Boat[] = []
    let parts: Particle[] = []
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

    function build(): void {
      let quality = frozen ? 0.5 : 1
      if (variant === 'ambient') quality *= 0.7
      measure()

      parts = []
      boats = []

      if (variant === 'journey') {
        // Eén evoluerende vorm, geen vloot: de lead-shape-deeltjes krijgen hun
        // identiteit hier (vormonafhankelijk); hun positie per stadium komt
        // pas in layout() bij, waar de schaal van het canvas bekend is.
        boats.push({
          ...JOURNEY_BOAT,
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
          tcx: JOURNEY_BOAT.cx,
          tcy: JOURNEY_BOAT.cy,
          theel: JOURNEY_BOAT.heel,
          dcx: JOURNEY_BOAT.cx,
          dcy: JOURNEY_BOAT.cy,
          dheel: JOURNEY_BOAT.heel,
          // Ongebruikt: journey vaart nooit weg/aan (zie de boot-lus in
          // draw(), die slot 0 altijd overslaat).
          curveSign: 1,
          distort: 0,
        })

        for (const p of buildJourneyIdentities(quality)) {
          p.boat = 0
          parts.push(p)
        }
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
          })

          for (const made of buildBoat(spec, b, quality)) {
            made.boat = b
            parts.push(made)
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
         nipt raken, niet structureel overlappen. */
      const share = narrowScreen ? 0.78 : variant === 'journey' ? 0.36 : 0.44
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
      const journeyStages =
        variant === 'journey'
          ? JOURNEY_STAGES.map((stage, si) => buildJourneyStage(stage, si, journeyQuality))
          : null

      parts.forEach((p, i) => {
        if (journeyStages && p.boat === 0) {
          const owner = boats[0]
          p.jx = journeyStages.map((pts) => (pts[i][0] - 0.5) * owner.pw)
          p.jy = journeyStages.map((pts) => (pts[i][1] - 0.48) * owner.ph)

          const ax = owner.px + p.jx[0]
          const ay = owner.py + p.jy[0]
          const vx = ax - w * 0.5
          const vy = ay - h * 0.52
          const k = 1.5 + ((i * 37) % 100) / 100
          p.sx = w * 0.5 + vx * k + ((i * 53) % 60) - 30
          p.sy = h * 0.52 + vy * k + ((i * 29) % 60) - 30
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
        // Startpositie van de opbouw: vanaf buiten het beeld naar binnen,
        // zodat de vloot zich verzamelt in plaats van te verschijnen.
        const ax = p.boat < 0 ? p.bx : boats[p.boat].px + p.bx
        const ay = p.boat < 0 ? p.by : boats[p.boat].py + p.by
        const vx = ax - w * 0.5
        const vy = ay - h * 0.52
        const kOut = 1.5 + ((i * 37) % 100) / 100
        /* Links staat de leestekst: een korrel die daar moet landen, laten we
           nauwelijks uitwaaieren — die vaart bijna stilstaand in. Rechts, waar
           de vloot woont, mag het wél voluit exploderen. Zo blijft de hele
           opbouw zichtbaar op de rechterkant in plaats van dwars over de
           tekst te vliegen. */
        const k = ax < w * 0.5 ? kOut * 0.16 : kOut
        p.sx = w * 0.5 + vx * k + ((i * 53) % 60) - 30
        p.sy = h * 0.52 + vy * k + ((i * 29) % 60) - 30
      })
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

      /* Scroll-voortgang lezen, één keer per frame — niet per deeltje. Onder
         frozen geen lopende interpolatie (t = 0): dan toont het de vorm die
         bij de dichtstbijzijnde sectie hoort, in stappen, niet vloeiend. */
      const rawProgress = variant === 'journey' ? (progressRef?.current ?? 0) : 0
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
        variant === 'journey'
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

      for (let bi = 0; bi < boats.length; bi++) {
        const boat = boats[bi]

        /* Hoe ver deze boot nog van haar doel af staat, in cx-fracties: 0
           voor de leidende boot (die schuift altijd rechtstreeks bij, geen
           boog/vervorming — "verplaatsen", geen "wegvaren") en voor een boot
           die al (bijna) op haar plek of geparkeerd staat, oplopend naar 1
           voor een boot die nog een heel eind moet wegvaren of aankomen. */
        const remain = bi === 0 ? 0 : Math.abs(boat.dcx - boat.tcx)
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
            let bx = p.jx[journeyStage] + (p.jx[journeyNext] - p.jx[journeyStage]) * journeyT
            let by = p.jy[journeyStage] + (p.jy[journeyNext] - p.jy[journeyStage]) * journeyT

            // De naald draait om de as (boot-lokale oorsprong), los van kast
            // en tikken — dezelfde reden dat het kompas 0.48 als middelpunt
            // koos: dat valt hier al samen met (0, 0).
            if (needleWobble !== 0 && p.slot !== undefined && NEEDLE_SLOTS.includes(p.slot)) {
              const wx = bx * needleCos - by * needleSin
              const wy = bx * needleSin + by * needleCos
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

            x = o.px + o.dx + bx * o.cos - by * o.sin
            y = o.py + o.dy + bx * o.sin + by * o.cos

            // Elke korrel heeft z'n eigen stijgsnelheid (vy), dus de vloot
            // rafelt uiteen terwijl hij wegdrijft in plaats van als één blok
            // omhoog te schuiven.
            if (liftoffRise > 0) y -= liftoffRise * (p.vy ?? 70)
          } else {
            const o = boats[p.boat]
            x = o.px + o.dx + p.bx * o.cos - p.by * o.sin
            y = o.py + o.dy + p.bx * o.sin + p.by * o.cos
            distort = o.distort
          }

          if (!frozen) {
            // Op volle overtocht buigt de jitter fors op: de boot oogt
            // onderweg als een korrelige, kokende wolk in plaats van een
            // vast blokje dat over de rail schuift.
            const ja = p.ja * (1 + distort * DISTORT_BOOST)
            x += Math.sin(time * p.jf + p.jp) * ja
            y += Math.cos(time * p.jf * 0.8 + p.jp) * ja * 0.7
          }

          if (forming) {
            const e = ease(Math.min(1, Math.max(0, (form - p.lag) / (1 - 0.45))))
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

          const r = p.r
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
     *  aanroep. */
    function setFormation(index: number, snap: boolean): void {
      if (variant === 'journey') return

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
         achter de scrollpositie aan en voelt het schokkerig. */
      const forming = now - t0 < formMs
      const frameGap = variant === 'journey' ? 0 : 30
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
