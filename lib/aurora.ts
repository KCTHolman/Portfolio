/* ==========================================================================
   Aurora — presets en kleurwiskunde.

   Alles hier is puur: geen DOM, geen tijd, geen toeval. De component geeft
   het verstreken aantal seconden mee en krijgt kleuren terug. Dat scheelt
   niet alleen testbaarheid — het houdt ook de render van de swatches
   deterministisch, en dus veilig onder SSR.

   Een preset is drie dingen: kleur, geometrie (swirl, brushstroke, softness,
   flow) en een drift — een trage zwaai in tint en licht met een eigen
   amplitude en periode, zodat niets ooit helemaal stilstaat en geen twee
   presets hetzelfde ademen. Preset 0 is de levende: die zwaait niet maar
   wandelt door de tint.
   ========================================================================== */

type Hsl = readonly [hue: number, saturation: number, lightness: number]
type Hsla = readonly [hue: number, saturation: number, lightness: number, alpha: number]

type AuroraGeometry = {
  /** Swirl-sterkte — de scale van de displacement map. */
  scale: number
  /** Brushstroke-detail — de baseFrequency van de turbulentie. */
  freq: number
  /** Blur-vermenigvuldiger. */
  soft: number
  /** Stroomsnelheid van de blob-animaties. */
  speed: number
}

export type AuroraDrift = {
  /** Graden tintzwaai. */
  amp: number
  /** Seconden voor een volledige zwaai. */
  period: number
}

export type AuroraPreset = {
  name: string
  /** De levende preset wandelt door de tint in plaats van te zwaaien. */
  auto?: boolean
  /** 'build': een deel van de blobs zwelt traag op en stort dan sneller in,
   *  in plaats van de standaard khDrift-zwaai — zie aur-stage--build in
   *  aurora.css. */
  motion?: 'build'
  geo: AuroraGeometry
  drift?: AuroraDrift
  /** Vijf blobs. Alleen afwezig op de levende preset, die ze afleidt. */
  cols?: readonly Hsla[]
  /** Drie accenten — dezelfde die de vloot en de wordmark lezen. */
  tcols?: readonly Hsl[]
}

export const PRESETS: readonly AuroraPreset[] = [
  { name: 'Levend', auto: true,
    geo: { scale: 20, freq: 0.014, soft: 1.3, speed: 0.5 } },

  { name: 'Aurora',
    geo: { scale: 12, freq: 0.010, soft: 1.5, speed: 0.40 },
    drift: { amp: 10, period: 70 },
    cols: [[168, 94, 58, 0.72], [152, 92, 56, 0.66], [272, 90, 58, 0.58], [212, 94, 60, 0.60], [174, 92, 56, 0.62]],
    tcols: [[50, 98, 64], [172, 66, 50], [172, 62, 68]] },

  { name: 'Zonsondergang',
    geo: { scale: 34, freq: 0.020, soft: 1.1, speed: 0.55 },
    drift: { amp: 14, period: 55 },
    cols: [[330, 96, 62, 0.72], [25, 96, 58, 0.70], [350, 92, 58, 0.62], [45, 96, 60, 0.62], [0, 92, 64, 0.64]],
    tcols: [[43, 96, 56], [353, 95, 71], [330, 86, 70]] },

  { name: 'Nevel',
    geo: { scale: 8, freq: 0.008, soft: 1.8, speed: 0.30 },
    drift: { amp: 18, period: 95 },
    cols: [[258, 94, 64, 0.70], [220, 92, 60, 0.64], [320, 90, 62, 0.58], [240, 92, 62, 0.60], [280, 92, 66, 0.62]],
    tcols: [[255, 92, 76], [213, 94, 68], [292, 91, 83]] },

  { name: 'Weelde',
    geo: { scale: 24, freq: 0.016, soft: 1.25, speed: 0.45 },
    drift: { amp: 8, period: 60 },
    cols: [[158, 94, 50, 0.70], [172, 92, 54, 0.64], [88, 90, 52, 0.60], [52, 94, 58, 0.58], [140, 92, 52, 0.62]],
    tcols: [[50, 98, 64], [160, 64, 52], [82, 78, 55]] },

  { name: 'Sintel',
    geo: { scale: 52, freq: 0.030, soft: 0.9, speed: 0.55 },
    drift: { amp: 12, period: 45 },
    cols: [[22, 98, 58, 0.74], [0, 94, 56, 0.66], [300, 88, 56, 0.54], [38, 96, 62, 0.62], [14, 94, 54, 0.66]],
    tcols: [[27, 97, 72], [27, 96, 61], [350, 89, 60]] },

  { name: 'IJs',
    geo: { scale: 4, freq: 0.006, soft: 1.6, speed: 0.25 },
    drift: { amp: 6, period: 120 },
    cols: [[196, 96, 64, 0.68], [228, 92, 68, 0.60], [186, 88, 74, 0.50], [204, 96, 58, 0.62], [214, 92, 70, 0.58]],
    tcols: [[201, 94, 86], [199, 95, 74], [226, 96, 89]] },

  { name: 'Citrus',
    geo: { scale: 28, freq: 0.024, soft: 1.0, speed: 0.62 },
    drift: { amp: 16, period: 38 },
    cols: [[52, 98, 60, 0.72], [82, 94, 56, 0.64], [172, 92, 52, 0.60], [32, 96, 60, 0.60], [68, 94, 58, 0.62]],
    tcols: [[50, 98, 64], [82, 78, 55], [168, 76, 64]] },

  { name: 'Inkt',
    geo: { scale: 6, freq: 0.007, soft: 1.9, speed: 0.20 },
    drift: { amp: 5, period: 140 },
    cols: [[226, 92, 46, 0.70], [248, 90, 52, 0.62], [206, 94, 50, 0.56], [266, 88, 48, 0.56], [216, 92, 44, 0.60]],
    tcols: [[213, 97, 79], [234, 89, 74], [229, 94, 82]] },

  { name: 'Koraal',
    geo: { scale: 18, freq: 0.013, soft: 1.35, speed: 0.50 },
    drift: { amp: 11, period: 65 },
    cols: [[6, 96, 66, 0.70], [340, 94, 66, 0.64], [28, 94, 64, 0.60], [316, 88, 68, 0.56], [352, 94, 62, 0.62]],
    tcols: [[0, 96, 89], [353, 95, 71], [353, 96, 82]] },

  { name: 'Onweer',
    geo: { scale: 64, freq: 0.035, soft: 0.8, speed: 0.58 },
    drift: { amp: 20, period: 30 },
    cols: [[210, 88, 52, 0.70], [262, 84, 54, 0.62], [160, 84, 48, 0.56], [196, 88, 56, 0.58], [232, 86, 50, 0.62]],
    tcols: [[186, 94, 82], [253, 95, 85], [187, 92, 69]] },

  /* Testpreset: een deel van de blobs zwelt op en stort weer in in plaats van
     te zwaaien — zie motion: 'build' hierboven en .aur-stage--build in
     aurora.css. */
  { name: 'Bouwwerk', motion: 'build',
    geo: { scale: 26, freq: 0.014, soft: 1.2, speed: 0.42 },
    drift: { amp: 10, period: 60 },
    cols: [[38, 90, 54, 0.70], [16, 88, 48, 0.64], [206, 30, 46, 0.56], [44, 70, 60, 0.60], [24, 80, 40, 0.62]],
    tcols: [[38, 92, 66], [16, 86, 60], [206, 40, 70]] },
]

export const BASE_GEOMETRY = PRESETS[0].geo

const HUE_START = 222
const HUE_PER_SEC = 9

/* Tintoffsets per blob op volle bloei voor de levende preset. Brede, ongelijke
   stappen — een bijna-complement en een violette sprong — zodat het steeds op
   combinaties landt die je niet zag aankomen. */
const HUE_STEPS = [0, 72, 186, 276, 138]
const SATS = [96, 94, 92, 96, 94]
const LIGHTS = [58, 56, 56, 58, 56]
const ALPHAS = [0.72, 0.68, 0.62, 0.62, 0.64]

/** De intro: de pagina opent bijna-zwart en blauw, en bloeit dan open. */
const RAMP_SEC = 16
const DIM = { sat: 38, light: 24, alpha: 0.16, paint: 0.34 }
const FULL_PAINT = 0.62

/** Hoe vaak de wash vanzelf naar een andere preset drijft, en hoe lang die
 *  overgave duurt — een crossfade, geen cut, zodat het zich nooit aankondigt. */
export const AUTO_CYCLE_SEC = 100
export const BLEND_SEC = 6

export type AuroraFrame = {
  cols: Hsla[]
  tcols: Hsl[]
  paintOp: number
}

/** Eén decimaal ligt ruim onder wat het oog oplost, en houdt de string kort —
 *  dit draait acht keer per frame. */
export function hsla(h: number, s: number, l: number, a: number): string {
  const deg = Math.round((((h % 360) + 360) % 360) * 10) / 10
  return `hsla(${deg},${Math.round(s * 10) / 10}%,${Math.round(l * 10) / 10}%,${a})`
}

/** 0 bij laden, 1 zodra de wash volledig is opengebloeid. */
export function bloomAt(elapsed: number): number {
  const t = Math.min(1, elapsed / RAMP_SEC)
  return t * t * (3 - 2 * t)
}

function hueAt(elapsed: number): number {
  return (HUE_START + elapsed * HUE_PER_SEC) % 360
}

/** Kleuren voor één preset op dit moment, als ruwe tuples in plaats van
 *  geformatteerde strings — blendFrames mengt er twee van. `bloom` komt van
 *  buiten omdat reduced motion en smalle schermen meteen op 1 beginnen. */
/** Drift voor presets zonder eigen `drift` (bv. de levende preset) — ook wat
 *  `deriveFormation` in fleet-geometry.ts gebruikt, zodat elke preset een
 *  zinnige vlootformatie krijgt zonder een aparte val-terug-waarde bij te
 *  houden. */
export const DEFAULT_DRIFT: AuroraDrift = { amp: 8, period: 80 }

export function computeFrame(presetIndex: number, elapsed: number, bloom: number): AuroraFrame {
  const p = PRESETS[presetIndex] ?? PRESETS[0]

  if (p.auto || !p.cols || !p.tcols) {
    const h = hueAt(elapsed)
    const mix = (from: number, to: number) => from + (to - from) * bloom

    // De tintoffsets schalen mee met de bloei, zodat de blobs gestapeld op één
    // blauw beginnen en pas uit elkaar drijven als de kleur opkomt.
    return {
      cols: HUE_STEPS.map((step, i): Hsla => [
        h + step * bloom,
        mix(DIM.sat, SATS[i]),
        mix(DIM.light, LIGHTS[i]),
        mix(DIM.alpha, ALPHAS[i]),
      ]),
      tcols: [
        [h, mix(70, 96), mix(62, 76)],
        [h + 72 * bloom, mix(66, 92), mix(56, 68)],
        [h + 186 * bloom, mix(68, 94), mix(64, 76)],
      ],
      paintOp: mix(DIM.paint, FULL_PAINT),
    }
  }

  const d = p.drift ?? DEFAULT_DRIFT
  const phase = (2 * Math.PI * elapsed) / d.period

  // Elke blob zit een stukje verder in dezelfde zwaai, zodat het palet ademt
  // in plaats van als één blok te schuiven.
  const amp = d.amp * 1.8
  return {
    cols: p.cols.map((c, i): Hsla => {
      const local = phase + i * 0.6
      return [
        c[0] + Math.sin(local) * amp,
        c[1],
        c[2] + Math.sin(local * 0.7) * 5,
        Math.max(0.2, Math.min(0.85, c[3] + Math.sin(local * 1.3) * 0.06)),
      ]
    }),
    tcols: p.tcols.map((c, i): Hsl => {
      const local = phase + i * 0.9
      return [c[0] + Math.sin(local) * amp * 0.6, c[1], c[2]]
    }),
    paintOp: FULL_PAINT,
  }
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k
}

/** Tint wrapt op 360, dus een naïeve lerp kan de lange weg nemen — deze pakt
 *  altijd de korte boog. */
function lerpHue(a: number, b: number, k: number): number {
  const diff = ((b - a + 540) % 360) - 180
  return a + diff * k
}

/** Mengt de uitgaande preset in de inkomende, met k van 0 naar 1. */
export function blendFrames(from: AuroraFrame, to: AuroraFrame, k: number): AuroraFrame {
  return {
    cols: to.cols.map((c, i): Hsla => {
      const f = from.cols[i]
      return [lerpHue(f[0], c[0], k), lerp(f[1], c[1], k), lerp(f[2], c[2], k), lerp(f[3], c[3], k)]
    }),
    tcols: to.tcols.map((c, i): Hsl => {
      const f = from.tcols[i]
      return [lerpHue(f[0], c[0], k), lerp(f[1], c[1], k), lerp(f[2], c[2], k)]
    }),
    paintOp: lerp(from.paintOp, to.paintOp, k),
  }
}

/** Elke swatch rijdt op de live accentvariabelen van zijn eigen preset, zodat
 *  de rij mee blijft zwaaien in plaats van een muur dode duimnagels te zijn. */
export function swatchBackground(p: AuroraPreset): string {
  if (p.auto || !p.cols) return 'linear-gradient(120deg, var(--t1), var(--t2) 45%, var(--t3))'
  const c = p.cols
  return `linear-gradient(120deg,${hsla(c[0][0], c[0][1], c[0][2], 1)},${hsla(c[3][0], c[3][1], c[3][2], 1)} 45%,${hsla(c[2][0], c[2][1], c[2][2], 1)})`
}
