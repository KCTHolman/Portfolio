'use client'

/* ==========================================================================
   Gedeeld prestatie-regime voor de vloot-canvas (use-fleet-scene.ts) en de
   aurora-achtergrond (aurora-provider.tsx).

   Drie kwaliteitsniveaus (0 laag, 1 midden, 2 vol) in plaats van een
   eenmalige aan/uit-terugval. Het regime is bewust asymmetrisch — hetzelfde
   idee als adaptieve bitrate bij streaming-video of dynamic resolution
   scaling in game-engines:

     omlaag  meteen, bij de eerste aaneengesloten reeks trage frames. Geen
             wachttijd: een zichtbare stotter weegt zwaarder dan een té
             voorzichtige terugval.
     omhoog  pas na een lang aaneengesloten venster van ruim-onder-budget
             frames, en nooit meer dan één stap tegelijk. Elke wijziging
             (welke kant op ook) reset de meting voor alle luisteraars —
             anders zou een net volgelopen "omhoog"-venster meteen
             doorschieten naar een niveau dat nog geen moment bewezen is.

   Start bij de eerste keer op dit apparaat op het laagste niveau: stabiel
   bij het inladen weegt zwaarder dan meteen de volle dichtheid tonen. Een
   volgend bezoek start bij het laatst bevestigde niveau (localStorage) — dat
   is al eens bewezen stabiel op dit apparaat — maar de meting loopt vanaf
   frame één gewoon door, dus een onterechte aanname corrigeert zichzelf
   net zo snel als bij een eerste bezoek.

   Geen hardgecodeerde uitzondering per renderengine: elke browser doorloopt
   precies dezelfde meting, en het gemeten niveau is het enige dat telt — ook
   op Firefox of iOS WebKit. Blijkt een niveau daar toch niet vol te houden,
   dan pakt de omlaag-kant van dit regime dat op dezelfde manier op als bij
   elk ander apparaat: meteen, na de eerste aaneengesloten reeks trage
   frames. Een korte overschatting die zichzelf binnen een paar frames
   corrigeert weegt hier zwaarder dan een permanente, niet meer te herziene
   aanname vooraf.
   ========================================================================== */

export type QualityTier = 0 | 1 | 2
export const MAX_TIER: QualityTier = 2

const TIER_STORE_KEY = 'kh-quality-tier'

function clampTier(n: number): QualityTier {
  if (n <= 0) return 0
  if (n >= MAX_TIER) return MAX_TIER
  return 1
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

/* ---------- de gedeelde teller zelf --------------------------------------
   Eén module-brede waarde: de vloot-canvas en de aurora-achtergrond lezen en
   schrijven 'm allebei, zodat een terugval op de een de ander niet blind op
   vol laat doortekenen. Puur closures, geen klasse — lazy geïnitialiseerd
   zodat readStoredTier()'s localStorage-toegang nooit vóór de eerste
   client-side aanroep (altijd vanuit een effect) loopt. */

let tier: QualityTier | null = null
const listeners = new Set<(tier: QualityTier) => void>()

function ensureTier(): QualityTier {
  if (tier === null) tier = readStoredTier() ?? 0
  return tier
}

/** Huidig gedeeld niveau — hetzelfde voor elke consument, geen enkele
 *  browser-specifieke uitzondering of bovengrens. */
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

/** Meteen, geen drempel — zie de uitleg bovenaan dit bestand. */
export function reportBad(): void {
  const t = ensureTier()
  if (t > 0) setTier((t - 1) as QualityTier)
}

/** Alleen als er nog ruimte is; de aanroeper telt zelf het venster van
 *  aaneengesloten goede samples (zie createFrameWatchdog()). */
export function reportGood(): void {
  const t = ensureTier()
  if (t < MAX_TIER) setTier((t + 1) as QualityTier)
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
 *  downStreak/upStreak tellen in samples, niet in tijd: bij een wisselende
 *  frame-cadans (rAF-throttling, net terug van een verborgen tabblad) is "N
 *  aaneengesloten metingen" een stabielere maat dan "N milliseconden". Een
 *  losse trage of losse snelle frame breekt de andere streak niet meteen af
 *  in de tussenzone (zie de else hieronder) — alleen een frame die duidelijk
 *  de andere kant op wijst doet dat, zodat ruis rond de budgetgrens niet om
 *  en om beide streaks laat resetten zonder dat er ooit een stap valt. */
export function createFrameWatchdog(budgetMs: number): FrameWatchdog {
  const DOWN_STREAK = 6
  const UP_STREAK = 90
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
          reportBad()
        }
      } else if (gap < budgetMs * UP_MARGIN) {
        upStreak++
        downStreak = 0
        if (upStreak >= UP_STREAK) {
          upStreak = 0
          reportGood()
        }
      } else {
        downStreak = 0
        upStreak = 0
      }
    },
  }
}
