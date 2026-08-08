'use client'

/* ==========================================================================
   Gedeeld prestatie-regime voor de vloot-canvas (use-fleet-scene.ts) en de
   aurora-achtergrond (aurora-provider.tsx).

   Twee standen — vol en verlaagd — in plaats van een hele trap. Optimistisch:
   start op vol en vertrouwt erop dat de meeste bezoekers een prima apparaat
   hebben, in plaats van iedereen eerst een bewijslast op te leggen. Het
   regime blijft wel asymmetrisch, want dát principe was altijd al goed:

     omlaag  meteen, bij de eerste aaneengesloten reeks trage frames. Geen
             wachttijd: een zichtbare stotter weegt zwaarder dan een té
             voorzichtige terugval.
     omhoog  pas na een venster van overtuigend onder-budget frames, met een
             korte, vaste afkoeltijd na een mislukte poging — genoeg om niet
             meteen opnieuw te flikkeren, zonder een eigen escalatielogica
             die zelf weer onderhoud vraagt. Elke wijziging (welke kant op
             ook) reset de meting voor alle luisteraars — anders zou een net
             volgelopen "omhoog"-venster meteen doorschieten naar een niveau
             dat nog geen moment bewezen is.

   Start bij de eerste keer op dit apparaat gewoon op vol: de volle beleving
   is het uitgangspunt, niet de uitzondering. Blijkt dat te optimistisch,
   dan grijpt de omlaag-kant hierboven binnen een handvol frames in. Een
   volgend bezoek start bij het laatst bevestigde niveau (localStorage) — dat
   is al eens gemeten op dit apparaat — maar de meting loopt vanaf frame één
   gewoon door, dus een onterechte aanname corrigeert zichzelf net zo snel
   als bij een eerste bezoek.

   Eén hardgecodeerde uitzondering: Firefox en Safari komen nooit boven de
   vloer uit, ook niet na een overtuigend goed venster. Beide renderengines
   zijn merkbaar strenger in wat ze op deze WebGL2-laag soepel houden dan
   Chromium — de meting zelf zou ze best na een tijdje omhoog laten
   klimmen, maar dat niveau bleek daar in de praktijk niet houdbaar. Elke
   andere browser doorloopt gewoon de volle meting hierboven, zonder
   bovengrens.
   ========================================================================== */

export type QualityTier = 0 | 1
export const MAX_TIER: QualityTier = 1

const TIER_STORE_KEY = 'kh-quality-tier'

function clampTier(n: number): QualityTier {
  return Math.min(MAX_TIER, Math.max(0, Math.round(n))) as QualityTier
}

function readStoredTier(): QualityTier | null {
  try {
    const raw = localStorage.getItem(TIER_STORE_KEY)
    if (raw === null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? clampTier(n) : null
  } catch {
    // Privémodus of een volle quota: dit bezoek onthoudt het niet voor de
    // volgende — de live meting compenseert vanaf frame één.
    return null
  }
}

function writeStoredTier(tier: QualityTier): void {
  try {
    localStorage.setItem(TIER_STORE_KEY, String(tier))
  } catch {
    // Zie readStoredTier().
  }
}

/* Firefox en Safari: nooit voorbij de vloor, zie de toelichting bovenaan dit
   bestand. Sniffen op userAgent is verder nergens in deze scène nodig
   (fleet-gl.ts's Safari-vermelding is alleen proza over de WebGL2-context
   die ontbreekt) — dit is de ene, bewuste uitzondering.

   De safari-check moet Chrome/Edge/Firefox op iOS uitsluiten: die bevatten
   allemaal "Safari" in hun userAgent (Apple's WebView-regel op iOS), maar
   zijn niet de Safari-renderengine waar dit om gaat. */
function detectTierCap(): QualityTier {
  if (typeof navigator === 'undefined') return MAX_TIER
  const ua = navigator.userAgent
  const isFirefox = /firefox/i.test(ua)
  const isSafari = /^(?!.*(chrome|chromium|crios|fxios|edg|android)).*safari/i.test(ua)
  return isFirefox || isSafari ? 0 : MAX_TIER
}

let tierCap: QualityTier | null = null

function ensureTierCap(): QualityTier {
  if (tierCap === null) tierCap = detectTierCap()
  return tierCap
}

/* ---------- de gedeelde teller zelf --------------------------------------
   Eén module-brede waarde: de vloot-canvas en de aurora-achtergrond lezen en
   schrijven 'm allebei, zodat een terugval op de een de ander niet blind op
   vol laat doortekenen. Puur closures, geen klasse — lazy geïnitialiseerd
   zodat readStoredTier()'s localStorage-toegang nooit vóór de eerste
   client-side aanroep (altijd vanuit een effect) loopt. */

let tier: QualityTier | null = null
const listeners = new Set<(tier: QualityTier) => void>()

/* Korte, vaste afkoeltijd ná een terugval: reportGood() hieronder wordt
   genegeerd zolang deze loopt. Bewust geen oplopend/escalerend schema — dat
   voegde een eigen laag toe die zelf weer kon vastlopen. Tien seconden is
   genoeg om niet binnen dezelfde adem opnieuw te flikkeren, kort genoeg om
   een kortstondige hapering (een tabwissel, een zware taak elders) niet
   nodeloos lang te laten nazinderen. */
const COOLDOWN_MS = 10000
let cooldownUntil = 0

function ensureTier(): QualityTier {
  // Optimistisch: start op vol tenzij dit apparaat eerder al `0` opsloeg.
  // Math.min met de cap vangt ook een Firefox/Safari-bezoeker die vóór deze
  // uitzondering al een `1` had opgeslagen — die zakt hier meteen terug.
  if (tier === null) tier = Math.min(ensureTierCap(), readStoredTier() ?? MAX_TIER) as QualityTier
  return tier
}

/** Huidig gedeeld niveau — hetzelfde voor elke consument, met precies één
 *  uitzondering: Firefox en Safari komen hier nooit boven de vloer uit, zie
 *  de toelichting bovenaan dit bestand. */
export function getTier(): QualityTier {
  return ensureTier()
}

/** fn krijgt elke wijziging, ook die een andere consument veroorzaakte —
 *  degene die zelf niets deed, moet zijn eigen meting alsnog resetten (zie
 *  createFrameWatchdog() hieronder), anders telt een net begonnen venster
 *  door bovenop een niveau dat nog geen moment bewezen is. */
export function subscribeTier(fn: (tier: QualityTier) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function setTier(next: QualityTier): void {
  if (next === ensureTier()) return
  tier = next
  writeStoredTier(next)
  listeners.forEach((fn) => fn(next))
}

/** Meteen, geen drempel — zie de uitleg bovenaan dit bestand. Zet ook de
 *  korte afkoeltijd voor de volgende omhoog-poging. */
export function reportBad(now: number): void {
  const t = ensureTier()
  if (t <= 0) return
  setTier((t - 1) as QualityTier)
  cooldownUntil = now + COOLDOWN_MS
}

/** Alleen als er nog ruimte is én de afkoeltijd van een eerdere terugval
 *  voorbij is; de aanroeper telt zelf het venster van aaneengesloten goede
 *  samples (zie createFrameWatchdog()). `ensureTierCap()` in plaats van
 *  `MAX_TIER`: op Firefox/Safari staat de cap al op 0, dus die stap komt
 *  hier nooit voorbij hun vloer, hoe lang het goede venster ook duurt. */
export function reportGood(now: number): void {
  const t = ensureTier()
  if (t >= ensureTierCap() || now < cooldownUntil) return
  setTier((t + 1) as QualityTier)
}

export type FrameWatchdog = {
  /** Roep dit precies één keer per animatieframe aan met het rAF-tijdstip. */
  sample: (now: number) => void
  /** Wist de lopende streaks en het laatst gemeten tijdstip, zonder het
   *  gedeelde niveau aan te raken — hoort bij het hervatten van een
   *  verborgen tabblad, waar het gat sinds de laatste sample soms minuten is
   *  en dus geen echte hapering voorstelt. */
  reset: () => void
  /** Meld af bij de gedeelde teller — hoort in de cleanup van het effect dat
   *  de watchdog aanmaakte, anders blijft de listener hangen voorbij een
   *  unmount (client-side navigatie mount/unmount't dit meerdere keren per
   *  sessie). */
  dispose: () => void
}

/** budgetMs: hoeveel ms een frame-tot-frame-gat mag zijn voordat dít
 *  onderdeel het als hapering telt — de vloot en de aurora-achtergrond
 *  hebben allebei hun eigen budget, want hun kostenprofiel verschilt.
 *
 *  UP_STREAK is bewust kort: een paar seconden overtuigend goede frames is
 *  genoeg, dit hoeft geen lange beproeving te zijn — de meeste bezoekers
 *  beginnen toch al op vol en komen hier nooit, dit pad is alleen voor wie
 *  al eens is teruggevallen en zich weer herstelt.
 *
 *  downStreak/upStreak tellen in samples, niet in tijd: bij een wisselende
 *  frame-cadans (rAF-throttling, net terug van een verborgen tabblad) is "N
 *  aaneengesloten metingen" een stabielere maat dan "N milliseconden". Een
 *  losse trage of losse snelle frame breekt de andere streak niet meteen af
 *  in de tussenzone (zie de else hieronder) — alleen een frame die duidelijk
 *  de andere kant op wijst doet dat, zodat ruis rond de budgetgrens niet om
 *  en om beide streaks laat resetten zonder dat er ooit een stap valt. */
export function createFrameWatchdog(budgetMs: number): FrameWatchdog {
  const DOWN_STREAK = 6
  const UP_STREAK = 100
  const UP_MARGIN = 0.7
  const SAMPLE_CAP_MS = 200

  let lastTick = 0
  let downStreak = 0
  let upStreak = 0

  const reset = () => {
    lastTick = 0
    downStreak = 0
    upStreak = 0
  }
  const unsubscribe = subscribeTier(reset)

  return {
    reset,
    dispose: unsubscribe,
    sample(now: number) {
      if (lastTick === 0) {
        lastTick = now
        return
      }
      const gap = Math.min(now - lastTick, SAMPLE_CAP_MS)
      lastTick = now

      if (gap > budgetMs) {
        downStreak++
        upStreak = 0
        if (downStreak >= DOWN_STREAK) {
          downStreak = 0
          reportBad(now)
        }
      } else if (gap < budgetMs * UP_MARGIN) {
        upStreak++
        downStreak = 0
        if (upStreak >= UP_STREAK) {
          upStreak = 0
          reportGood(now)
        }
      } else {
        downStreak = 0
        upStreak = 0
      }
    },
  }
}
