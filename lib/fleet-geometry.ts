/* ==========================================================================
   De vloot — vorm en deeltjes.

   Honderden losse driehoekjes vormen samen één schouw onder zeil, met een
   vloot kleinere boten eromheen. Geen plaatje maar een veld puntlichten.

   Alles hier is puur en zonder DOM: uit een genormaliseerde vorm komt een
   lijst korrels. De component rekent die om naar pixels en tekent ze.
   ========================================================================== */

export type Point = readonly [x: number, y: number]

/** Terugkeertijden in seconden. Elke korrel valt in één van deze bakjes, en
 *  dus komt niet alles tegelijk thuis: de vorm hervindt zichzelf als een golf
 *  in plaats van in één klik. Bakjes en geen waarde per korrel, want dan hoeft
 *  de e-macht acht keer per frame berekend te worden en niet drieduizend keer. */
export const SETTLE = [0.28, 0.36, 0.44, 0.53, 0.63, 0.74, 0.87, 1.02]

export const COLORS = 6
export const TIERS = 8

export function ease(x: number): number {
  return 1 - Math.pow(1 - x, 3)
}

/* ---------- willekeur met een geheugen ----------------------------------
   Dezelfde seed geeft dezelfde boot. Dat is geen detail: zonder zaad tekent
   elke paginaovergang een nét andere vloot, en dan is het een effect in
   plaats van een beeldmerk. --------------------------------------------- */

export function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- de vorm ------------------------------------------------------
   Alles in een genormaliseerd vak: x van achterlijk grootzeil (0) tot
   kluiverboom (1), y van wimpel (0) tot onder de kiel (~0.9). De boeg wijst
   naar rechts.

   Geen rechttoe rechtaan driehoekje op een bak, maar het silhouet van een
   zeiler onder vol tuig: mast met rake naar achteren, grootzeil met een bol
   achterlijk, twee voorzeilen die naar de kluiverboom aflopen, en een lage
   sikkelvormige romp. Drie dingen doen daarbij het echte werk:

     de spleten   smalle stukken zwart tussen de zeilen. Zonder die twee
                  spleten smelt alles samen tot één driehoekige wolk.
     de bollingen elk vrij liggend lijk staat bol. Kaarsrechte lijken lezen
                  als een pictogram, niet als doek onder wind.
     de helling   het geheel ligt een paar graden over stuurboord, en dat is
                  wat het verschil maakt tussen varen en stilliggen.
   ---------------------------------------------------------------------- */

/** Punten langs een kwadratische bocht van a naar b; de bolling duwt het
 *  midden loodrecht opzij, zodat een zeil bol staat en niet als een
 *  driehoekje uit een tekenprogramma leest. */
function curve(a: Point, b: Point, bulge: number, steps: number): Point[] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const cx = (a[0] + b[0]) / 2 - dy * bulge
  const cy = (a[1] + b[1]) / 2 + dx * bulge
  const out: Point[] = []
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push([
      u * u * a[0] + 2 * u * t * cx + t * t * b[0],
      u * u * a[1] + 2 * u * t * cy + t * t * b[1],
    ])
  }
  return out
}

function poly(...parts: (Point | Point[])[]): Point[] {
  const pts: Point[] = []
  for (const part of parts) {
    if (typeof part[0] === 'number') pts.push(part as Point)
    else pts.push(...(part as Point[]))
  }
  return pts
}

/** Een spar is geen lijn maar een heel dun vierkantje, anders valt er geen
 *  omtrek langs te lopen. */
function spar(a: Point, b: Point, thick: number): Point[] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * thick
  const ny = (dx / len) * thick
  return [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ]
}

const P = {
  mastTop: [0.392, 0.044],
  mastFoot: [0.424, 0.742],
  // grootzeil
  head: [0.396, 0.070],
  tack: [0.420, 0.678],
  clew: [0.038, 0.734],
  // binnenfok
  jibHead: [0.458, 0.186],
  jibTack: [0.828, 0.742],
  jibClew: [0.578, 0.706],
  // kluiver, aangeslagen op het eind van de boegspriet
  flyHead: [0.474, 0.076],
  flyTack: [0.972, 0.640],
  flyClew: [0.802, 0.648],
  // romp
  sternTop: [0.052, 0.762],
  stemHead: [0.846, 0.736],
  stemTip: [0.894, 0.782],
  sternFoot: [0.148, 0.848],
  sprit: [0.988, 0.634],
} as const satisfies Record<string, Point>

/** Grootzeil: het achterlijk bol naar achteren, het onderlijk hangt door tot
 *  net onder de giek. */
const MAINSAIL = poly(P.head, curve(P.head, P.clew, 0.085, 12), P.clew, curve(P.clew, P.tack, -0.022, 5), P.tack)

/** Binnenfok: voorlijk staat strak op de stag, achterlijk bol naar voren. */
const JIB = poly(
  P.jibHead,
  curve(P.jibHead, P.jibTack, 0.018, 7),
  P.jibTack,
  curve(P.jibTack, P.jibClew, -0.03, 4),
  P.jibClew,
  curve(P.jibClew, P.jibHead, 0.055, 7),
)

/** Kluiver: de buitenste, met het meeste doek in de bolling — dit is het zeil
 *  dat het silhouet naar voren trekt. */
const FLYER = poly(
  P.flyHead,
  curve(P.flyHead, P.flyTack, 0.030, 8),
  P.flyTack,
  curve(P.flyTack, P.flyClew, -0.035, 4),
  P.flyClew,
  curve(P.flyClew, P.flyHead, 0.048, 7),
)

/** Romp: laag en sikkelvormig, met een geveegde voorsteven en een
 *  doorhangende zeeg. Geen bak — dit is wat 'm slank houdt. */
const HULL = poly(
  P.sternTop,
  curve(P.sternTop, P.stemHead, 0.030, 10),
  P.stemHead,
  P.stemTip,
  curve(P.stemTip, P.sternFoot, -0.020, 10),
  P.sternFoot,
)

const MAST = spar(P.mastTop, P.mastFoot, 0.007)
const BOOM = spar([0.062, 0.730], [0.422, 0.680], 0.006)
const SPRIT = spar(P.stemHead, P.sprit, 0.0055)
const FLAG: Point[] = [P.mastTop, [0.392, 0.086], [0.286, 0.048]]

type Shape = {
  pts: Point[]
  /** Aantal driehoekjes op de omtrek, geteld voor de voorste boot op volle grootte. */
  edge: number
  /** Idem in het vlak. Ver weg vervalt de vulling en blijft er een lijntekening over. */
  fill: number
  /** Uit welke hoek van het palet dit deel z'n kleur trekt. */
  bias: number[]
}

/* Het moeten er veel zijn: bij een handvol punten per zeil ziet niemand een
   boot, alleen ruis. Pas als de korrels dichter op elkaar staan dan ze groot
   zijn, klapt het veld om in een vorm. De omtrek krijgt daarbij meer dan het
   vlak — een rand die leest doet meer voor de herkenbaarheid dan een dichtere
   vulling. */
const SHAPES: Shape[] = [
  { pts: HULL, edge: 300, fill: 250, bias: [2, 3, 3, 5] },
  { pts: MAINSAIL, edge: 320, fill: 400, bias: [0, 0, 1, 5] },
  { pts: JIB, edge: 230, fill: 195, bias: [1, 1, 0, 5] },
  { pts: FLYER, edge: 240, fill: 165, bias: [1, 0, 2, 5] },
  { pts: MAST, edge: 100, fill: 0, bias: [3, 5] },
  { pts: BOOM, edge: 66, fill: 0, bias: [3, 5] },
  { pts: SPRIT, edge: 60, fill: 0, bias: [3, 5] },
  { pts: FLAG, edge: 30, fill: 0, bias: [4] },
]

export const LEAD_W = 0.72

/** Hoogte gedeeld door breedte van het genormaliseerde vak: de vorm loopt van
 *  x 0.04 tot 0.99 en van y 0.04 tot 0.96, en dat is bijna vierkant. */
export const RATIO = 0.96

/* ---------- punten uit een vorm halen ----------------------------------- */

function inside(pts: Point[], x: number, y: number): boolean {
  let hit = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]
    const b = pts[j]
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit
  }
  return hit
}

function bounds(pts: Point[]): [number, number, number, number] {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of pts) {
    if (p[0] < x0) x0 = p[0]
    if (p[0] > x1) x1 = p[0]
    if (p[1] < y0) y0 = p[1]
    if (p[1] > y1) y1 = p[1]
  }
  return [x0, y0, x1, y1]
}

/** Gelijkmatig over de omtrek, met een beetje speling loodrecht op de lijn:
 *  kaarsrecht uitgemeten punten lezen als een raster, niet als een sterrenbeeld. */
function edgePoints(pts: Point[], count: number, rnd: () => number, out: Point[]): void {
  const segs: [Point, Point, number][] = []
  let total = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (len > 0) {
      segs.push([a, b, len])
      total += len
    }
  }
  if (!total) return

  const step = total / count
  let walked = step * rnd()
  let si = 0
  let acc = segs[0][2]
  for (let n = 0; n < count; n++) {
    while (walked > acc && si < segs.length - 1) {
      si++
      acc += segs[si][2]
    }
    const s = segs[si]
    const t = 1 - (acc - walked) / s[2]
    const dx = (s[1][0] - s[0][0]) / s[2]
    const dy = (s[1][1] - s[0][1]) / s[2]
    const off = (rnd() - 0.5) * 0.013
    out.push([s[0][0] + dx * s[2] * t - dy * off, s[0][1] + dy * s[2] * t + dx * off])
    walked += step
  }
}

function fillPoints(pts: Point[], count: number, rnd: () => number, out: Point[]): void {
  const bb = bounds(pts)
  let tries = 0
  let made = 0
  while (made < count && tries < count * 60) {
    tries++
    const x = bb[0] + rnd() * (bb[2] - bb[0])
    const y = bb[1] + rnd() * (bb[3] - bb[1])
    if (!inside(pts, x, y)) continue
    out.push([x, y])
    made++
  }
}

/* ---------- palet --------------------------------------------------------
   Zes kleuren: drie live accenten van de aurora, het vaste merkgroen, een
   amberen vonk en wit. De verhouding is met opzet scheef — amber en wit zijn
   accenten, geen partij. ------------------------------------------------ */

export const FALLBACK_ACCENTS: [number, number, number][] = [
  [172, 62, 68],
  [172, 66, 56],
  [222, 68, 64],
]

export const FIXED_COLORS: [number, number, number][] = [
  [172, 62, 68],
  [40, 100, 58],
  [0, 0, 100],
]

export function parseHsl(str: string): [number, number, number] | null {
  const m = /hsla?\(\s*(-?[\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/.exec(str || '')
  return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])] : null
}

/* ---------- korrels ------------------------------------------------------ */

export type Particle = {
  /** Genormaliseerde positie binnen de vorm. */
  ux: number
  uy: number
  /** Index in het palet. */
  col: number
  /** Helderheidslaag. */
  tier: number
  r: number
  spin: number
  /** Jitter: frequentie, fase, amplitude. */
  jf: number
  jp: number
  ja: number
  /** Vertraging in de opbouw. */
  lag: number
  /** Alleen stof: horizontale drift in pixels per seconde. */
  vx?: number
  /** Hoe ver deze korrel nu uit positie geroerd is door de muis. */
  ox: number
  oy: number
  /** Eigen vluchtrichting en eigen gevoeligheid, zodat buren uit elkaar gaan
   *  in plaats van samen opzij te schuiven. */
  chaos: number
  grip: number
  /** In welk terugkeerbakje deze korrel valt. */
  traag: number
  /** Basispositie in pixels, en de startpositie van de opbouw. */
  bx: number
  by: number
  sx: number
  sy: number
  /** Index van de boot, of -1 voor los stof. */
  boat: number
}

export type BoatSpec = {
  /** Fracties van het hele beeldscherm, niet van een kolom. */
  cx: number
  cy: number
  /** Breedte in fracties van de basismaat. */
  w: number
  /** Stuurt helderheid, korrelgrootte en dichtheid in één keer — dat is wat
   *  afstand hier is. */
  depth: number
  par: number
  /** Hoeveel de boot overligt, in radialen. */
  heel: number
}

/* Het canvas ligt schermvullend achter de pagina. De boten houden daarom de
   rechterhelft aan — links staat de tekst — terwijl het losse stof wél overal
   drijft. Zo houdt het beeld geen rand waar het ophoudt. */
export const HERO_BOATS: BoatSpec[] = [
  { cx: 0.755, cy: 0.570, w: LEAD_W, depth: 1.00, par: 1.00, heel: -0.052 },
  { cx: 0.605, cy: 0.165, w: 0.20, depth: 0.48, par: 0.48, heel: -0.070 },
  { cx: 0.890, cy: 0.145, w: 0.15, depth: 0.38, par: 0.38, heel: 0.048 },
  { cx: 0.745, cy: 0.085, w: 0.11, depth: 0.28, par: 0.28, heel: -0.040 },
  { cx: 0.945, cy: 0.300, w: 0.09, depth: 0.24, par: 0.24, heel: 0.055 },
  { cx: 0.565, cy: 0.855, w: 0.12, depth: 0.30, par: 0.30, heel: -0.062 },
  { cx: 0.870, cy: 0.895, w: 0.08, depth: 0.20, par: 0.20, heel: -0.045 },
]

export const AMBIENT_BOATS: BoatSpec[] = [
  { cx: 0.16, cy: 0.22, w: 0.11, depth: 0.30, par: 0.30, heel: -0.06 },
  { cx: 0.78, cy: 0.16, w: 0.08, depth: 0.24, par: 0.24, heel: 0.05 },
  { cx: 0.62, cy: 0.72, w: 0.13, depth: 0.34, par: 0.34, heel: -0.045 },
  { cx: 0.30, cy: 0.84, w: 0.07, depth: 0.20, par: 0.20, heel: 0.04 },
  { cx: 0.92, cy: 0.55, w: 0.06, depth: 0.18, par: 0.18, heel: -0.05 },
]

function pick(rnd: () => number, list: number[]): number {
  return list[(rnd() * list.length) | 0]
}

function particle(ux: number, uy: number, col: number, depth: number, rnd: () => number): Particle {
  const tier = Math.min(TIERS - 1, Math.max(0, Math.round((depth * 0.72 + rnd() * 0.4) * (TIERS - 1))))
  return {
    ux,
    uy,
    col,
    tier,
    // Korrel: dichtbij groter. Onder de 1,4px verdwijnt een omlijnd
    // driehoekje in z'n eigen lijn, dus dat is de bodem.
    r: (1.4 + rnd() * 2.1) * (0.55 + depth * 0.45),
    spin: rnd() * Math.PI * 2,
    jf: 0.25 + rnd() * 0.5,
    jp: rnd() * Math.PI * 2,
    ja: 0.6 + rnd() * 1.5,
    lag: rnd() * 0.45,
    ox: 0,
    oy: 0,
    chaos: rnd() * Math.PI * 2,
    grip: 0.45 + rnd() * 1.0,
    traag: (rnd() * SETTLE.length) | 0,
    bx: 0,
    by: 0,
    sx: 0,
    sy: 0,
    boat: 0,
  }
}

/** Eén boot: omtrek, vulling en een spoor van kielwater eronder. Alles komt
 *  terug in het genormaliseerde vak, zodat het bij elke maat canvas opnieuw om
 *  te rekenen is zonder de vorm opnieuw te hoeven trekken. */
export function buildBoat(boat: BoatSpec, index: number, quality: number): Particle[] {
  const rnd = rng(0x5c40 + index * 977)
  const parts: Particle[] = []
  const d = boat.depth
  /* Dichtheid hangt aan twee dingen tegelijk. Aan afstand, want verder weg
     hoort ijler. En aan de maat op het scherm: dezelfde aantallen op een boot
     van zeventig pixels geven een prop in plaats van een tekening. */
  const detail = Math.pow(Math.min(1, boat.w / LEAD_W), 0.8) * (0.45 + d * 0.55) * quality

  for (const shape of SHAPES) {
    const pts: Point[] = []
    const edge = Math.max(6, Math.round(shape.edge * detail))
    edgePoints(shape.pts, edge, rnd, pts)

    // Vulling alleen dichtbij: verderop is een boot een lijntekening.
    if (shape.fill && d > 0.55) {
      fillPoints(shape.pts, Math.round(shape.fill * detail * (d - 0.35)), rnd, pts)
    }

    for (const pt of pts) {
      // Eén op de twintig driehoekjes pakt een amberen vonk, waar het deel ook
      // uit put. Zonder die uitschieters wordt het veld te netjes.
      const col = rnd() < 0.05 ? 4 : pick(rnd, shape.bias)
      parts.push(particle(pt[0], pt[1], col, d, rnd))
    }
  }

  // Kielwater: een korte veeg onder de romp die de boot op het water zet zonder
  // dat er een horizon getekend hoeft te worden.
  const wake = Math.round(90 * detail)
  for (let w = 0; w < wake; w++) {
    const t = rnd()
    const x = 0.03 + t * 0.93
    const spread = Math.sin(t * Math.PI)
    parts.push(
      particle(x, 0.905 + rnd() * 0.055 * (1.4 - spread), rnd() < 0.3 ? 5 : pick(rnd, [2, 3]), d * 0.55 * spread, rnd),
    )
  }

  return parts
}

export function buildAmbientDust(count: number, rnd: () => number): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < count; i++) {
    out.push({
      ux: rnd(),
      uy: rnd(),
      col: rnd() < 0.12 ? 4 : rnd() < 0.3 ? 5 : (rnd() * 3) | 0,
      tier: (rnd() * 4) | 0,
      r: 1.2 + rnd() * 1.6,
      spin: rnd() * Math.PI * 2,
      jf: 0.12 + rnd() * 0.3,
      jp: rnd() * Math.PI * 2,
      ja: 1.5 + rnd() * 3,
      lag: rnd() * 0.45,
      vx: (rnd() - 0.5) * 5,
      ox: 0,
      oy: 0,
      chaos: rnd() * Math.PI * 2,
      grip: 0.45 + rnd() * 1.0,
      traag: (rnd() * SETTLE.length) | 0,
      bx: 0,
      by: 0,
      sx: 0,
      sy: 0,
      boat: -1,
    })
  }
  return out
}
