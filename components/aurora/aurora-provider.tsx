'use client'

/* ==========================================================================
   Aurora — de lifecycle.

   Deze component houdt precies één ding in React-state: welke preset actief
   is. Al het andere leeft in refs, want het verandert 25 keer per seconde en
   niets in de boom hoeft daarop te hertekenen: de loop schrijft de kleuren
   rechtstreeks als custom properties op <html>, waar aurora.css, site.css en
   de vloot ze alle drie lezen.

   Wat wél per preset verandert — geometrie, de swatch die "aan" staat — gaat
   gewoon door de render, declaratief. Dat is de scheiding: per frame
   imperatief, per keuze declaratief.

   tabHidden is de uitzondering op "per frame imperatief": de zes geblurde
   blobs, de SVG-vervormingsfilter en de korrel draaien op eigen CSS
   @keyframes, niet op de rAF-loop hieronder — die loop pauzeert al op
   visibilitychange, maar de CSS-animaties zelf lopen gewoon door op een
   verborgen tabblad. tabHidden geeft aurora-stage.tsx een klasse om ze
   daar ook echt stil te zetten: niets zichtbaars verandert (het tabblad is
   toch verborgen), alleen de kosten vallen weg zolang niemand kijkt. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  AUTO_CYCLE_SEC,
  BLEND_SEC,
  PRESETS,
  applyOverride,
  blendFrames,
  bloomAt,
  computeFrame,
  hsla,
  type AuroraFrame,
  type AuroraOverride,
  type AuroraPreset,
} from '@/lib/aurora'
import { MAX_TIER, createFrameWatchdog, getTier, subscribeTier } from '@/lib/perf-quality'
import { usePrefersReducedMotion } from '@/lib/use-media-query'

type AuroraContextValue = {
  presets: readonly AuroraPreset[]
  activePreset: number
  selectPreset: (index: number) => void
  /** Rechtstreeks afgeleid van het gedeelde kwaliteitsniveau in
   *  lib/perf-quality.ts: `true` zodra dat niveau onder MAX_TIER zakt. Geen
   *  eigen bewijstijd of afkoeltijd meer voor het SVG-vervormingsfilter —
   *  het gedeelde regime zelf (optimistische start, snelle omlaag-reactie,
   *  korte vaste afkoeltijd) is genoeg vangnet. */
  reducedQuality: boolean
  /** True zolang het tabblad verborgen is — zie de uitleg bovenaan dit
   *  bestand. AuroraStage zet hiermee de losse CSS @keyframes stil die de
   *  rAF-loop hieronder niet aanraakt. */
  tabHidden: boolean
  /** Alleen voor het exploratieve override-paneel op /playground — zie
   *  lib/aurora.ts. Nooit bewaard, en negeert de bestaande preset-keuze
   *  niet: `effectivePreset` hieronder is de preset mét deze override erover
   *  gelegd. */
  override: AuroraOverride | null
  setOverride: (next: AuroraOverride | null) => void
  /** `presets[activePreset]` mét `override` erover gemerged — waar
   *  AuroraStage en het playground-paneel uit horen te lezen in plaats van
   *  zelf `presets[activePreset]` te pakken, zodat een override ook de
   *  geometrie (SVG-filter/CSS) raakt. */
  effectivePreset: AuroraPreset
}

const AuroraContext = createContext<AuroraContextValue | null>(null)

export function useAurora(): AuroraContextValue {
  const value = useContext(AuroraContext)
  if (!value) throw new Error('useAurora moet binnen <AuroraProvider> gebruikt worden')
  return value
}

/** De achtergrond loopt door tussen pagina's: dezelfde preset, en — omdat t0
 *  meereist — hetzelfde punt in de wandeling, de zwaai en de bloei. */
const STORE_KEY = 'kh-aurora'

type StoredSession = {
  preset: number
  t0: number
  nextSwitchAt: number
}

function readSession(): Partial<StoredSession> | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Partial<StoredSession>) : null
  } catch {
    // Private mode of een volle quota: de achtergrond begint gewoon opnieuw.
    return null
  }
}

function writeSession(session: StoredSession): void {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(session))
  } catch {
    // Zie readSession.
  }
}

export function AuroraProvider({ children }: { children: ReactNode }) {
  const reduceMotion = usePrefersReducedMotion()

  /* Begint deterministisch op 0 zodat server en client dezelfde HTML
     opleveren; de sessie of een willekeurige keuze komt in het mount-effect
     hieronder. */
  const [activePreset, setActivePreset] = useState(0)
  /* Zelfde reden als activePreset hierboven: begint deterministisch op false
     zodat server en client gelijk renderen, en pas ná mount leest een los
     effect hieronder de opgeslagen vlag terug. */
  const [reducedQuality, setReducedQuality] = useState(false)
  /* Begint op false om dezelfde server/client-reden als hierboven; het
     mount-effect hieronder zet 'm meteen goed als het tabblad al bij de
     eerste render verborgen is. */
  const [tabHidden, setTabHidden] = useState(false)
  /* Alleen voor het override-paneel op /playground — begint op null (geen
     override) en blijft dat voor elke andere pagina, voor altijd. */
  const [override, setOverrideState] = useState<AuroraOverride | null>(null)

  const presetRef = useRef(0)
  /* Spiegelt `override` hierboven, om dezelfde reden als presetRef
     hieronder spiegelt: paint() draait in een rAF-loop, niet als render, en
     mag daar geen nieuwe functie-identiteit per override-wijziging voor
     nodig hebben. */
  const overrideRef = useRef<AuroraOverride | null>(null)
  const startedAtRef = useRef(0)
  const nextSwitchAtRef = useRef(AUTO_CYCLE_SEC)
  const blendRef = useRef<{ fromFrame: AuroraFrame; startElapsed: number } | null>(null)
  /* Het laatst getekende frame — de blend vertrekt hiervandaan in plaats van
     vanaf de rauwe preset, anders springt de kleur naar de schone bronkleur
     zodra een nieuwe keuze een nog lopende overvloei onderbreekt. */
  const lastFrameRef = useRef<AuroraFrame | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastPaintRef = useRef(0)

  /* Reduced motion ziet de loop nooit, en krijgt het afgemaakte beeld meteen
     in plaats van eeuwig op het openingsframe te blijven staan. */
  const staticFrame = reduceMotion

  /* presets[presetRef.current] mét een eventuele override erover gelegd —
     wat paint() en switchPreset() hieronder aan computeFrame meegeven in
     plaats van rechtstreeks een index. Leest alleen refs, dus veilig om
     vanuit elke closure hieronder aan te roepen zonder in een
     dependency-array te moeten staan. */
  const getEffectivePreset = () => applyOverride(PRESETS[presetRef.current] ?? PRESETS[0], overrideRef.current)

  /* setOverride schrijft, net als switchPreset voor activePreset/presetRef
     al deed, in één moeite door de ref (voor de imperatieve paint()-loop)
     én de state (voor render-consumers zoals AuroraStage). */
  const setOverride = useCallback((next: AuroraOverride | null) => {
    overrideRef.current = next
    setOverrideState(next)
  }, [])

  const paint = useCallback(() => {
    const root = document.documentElement
    const elapsed = (Date.now() - startedAtRef.current) / 1000
    const bloom = staticFrame ? 1 : bloomAt(elapsed)

    let frame = computeFrame(getEffectivePreset(), elapsed, bloom)

    const blend = blendRef.current
    if (blend) {
      const t = Math.min(1, (elapsed - blend.startElapsed) / BLEND_SEC)
      const k = t * t * (3 - 2 * t)
      frame = blendFrames(blend.fromFrame, frame, k)
      if (t >= 1) blendRef.current = null
    }

    lastFrameRef.current = frame

    root.style.setProperty('--aur-paint-op', frame.paintOp.toFixed(3))
    frame.cols.forEach((c, i) => {
      root.style.setProperty(`--c${i + 1}`, hsla(c[0], c[1], c[2], c[3]))
    })
    frame.tcols.forEach((c, i) => {
      root.style.setProperty(`--t${i + 1}`, hsla(c[0], c[1], c[2], 1))
    })
  }, [staticFrame])

  const switchPreset = useCallback(
    (index: number) => {
      /* Vóór de vroege return hieronder: anders zou opnieuw klikken op de
         al-actieve swatch tijdens een override 'm stilletjes laten staan in
         plaats van 'm te wissen. Een nieuwe (of dezelfde) preset is een
         schone basis om vanaf te experimenteren, geen stapeling op wat er
         net overreden werd. */
      setOverride(null)
      if (index === presetRef.current && !blendRef.current) return

      const elapsed = (Date.now() - startedAtRef.current) / 1000
      if (staticFrame) {
        blendRef.current = null
      } else {
        // Valt terug op de rauwe preset alleen als er nog nooit geschilderd is —
        // in de praktijk staat lastFrameRef altijd al vanaf de mount-paint.
        const fromFrame = lastFrameRef.current ?? computeFrame(getEffectivePreset(), elapsed, bloomAt(elapsed))
        blendRef.current = { fromFrame, startElapsed: elapsed }
      }
      presetRef.current = index
      /* Een handmatige keuze duwt de automatische drift een volle cyclus
         vooruit, zodat die de keuze niet meteen overruled. */
      nextSwitchAtRef.current = elapsed + AUTO_CYCLE_SEC

      setActivePreset(index)
      paint()
      writeSession({
        preset: index,
        t0: startedAtRef.current,
        nextSwitchAt: nextSwitchAtRef.current,
      })
    },
    [paint, setOverride, staticFrame],
  )

  /* reducedQuality volgt het gedeelde niveau (lib/perf-quality.ts)
     rechtstreeks — geen eigen bewijs- of afkoeltijd meer voor dit filter. */
  useEffect(() => {
    const sync = () => setReducedQuality(getTier() < MAX_TIER)
    sync()
    return subscribeTier(sync)
  }, [])

  /* ---------- sessie oppakken -------------------------------------------- */

  useEffect(() => {
    const now = Date.now()
    startedAtRef.current = now

    const saved = readSession()
    /* Geen sessie: een willekeurige preset. Dat toeval hoort hier en niet in
       de module-scope — daar zou het per render verschillen tussen server en
       client. */
    let preset = Math.floor(Math.random() * PRESETS.length)

    if (saved) {
      const i = Number(saved.preset)
      // Geklemd: een opgeslagen index overleeft het verwijderen van een preset.
      if (Number.isFinite(i)) preset = Math.min(PRESETS.length - 1, Math.max(0, Math.trunc(i)))

      const when = Number(saved.t0)
      if (Number.isFinite(when) && when > 0 && when <= now) startedAtRef.current = when

      const next = Number(saved.nextSwitchAt)
      if (Number.isFinite(next) && next > 0) nextSwitchAtRef.current = next
    }

    presetRef.current = preset
    setActivePreset(preset)
    paint()
    writeSession({
      preset,
      t0: startedAtRef.current,
      nextSwitchAt: nextSwitchAtRef.current,
    })
  }, [paint])

  /* ---------- de loop ------------------------------------------------------ */

  /* Links alleen gelaten drijft de wash elke AUTO_CYCLE_SEC naar een andere
     preset — een trage crossfade, nooit een cut. Dit is een effect-event en
     geen gewone callback, zodat de loop hieronder niet opnieuw hoeft te
     abonneren telkens als switchPreset een nieuwe identiteit krijgt. */
  const advanceAutoCycle = useEffectEvent(() => {
    const options: number[] = []
    for (let i = 0; i < PRESETS.length; i++) {
      if (i !== presetRef.current) options.push(i)
    }
    switchPreset(options[Math.floor(Math.random() * options.length)])
  })

  useEffect(() => {
    if (staticFrame) {
      // Eén stilstaand, volledig opgebloeid frame en verder niets.
      paint()
      return
    }

    let cancelled = false

    /* ---------- prestatiebewaking, hetzelfde idee als de vloot-canvas -----
       paint() zelf is triviaal (een paar custom properties zetten) — de
       kosten zitten in wat de browser daarna moet rasterizen: zes geblurde
       lagen achter een SVG-vervormingsfilter (zie aurora-stage.tsx). Dat werk
       vertraagt de eerstvolgende requestAnimationFrame-aanroep net zo goed
       als een zware JS-taak dat zou doen, dus het echte gat tussen twee ticks
       is de juiste maat — niet hoe lang paint() zelf duurt. Watchdog schrijft
       naar hetzelfde gedeelde niveau als de vloot-canvas (lib/perf-quality.ts)
       — de sync()-listener hierboven vertaalt elke wijziging, van welke kant
       ook, terug naar reducedQuality. */
    const PERF_WARMUP_MS = 1000
    const watchdog = createFrameWatchdog(40)

    const tick = (now: number) => {
      if (cancelled) return

      if (now - startedAtRef.current > PERF_WARMUP_MS) {
        watchdog.sample(now)
      }

      const elapsed = (Date.now() - startedAtRef.current) / 1000
      /* Een actieve override mag niet weggedreven worden onder je vandaan —
         zie setOverride hierboven. */
      if (!reduceMotion && !overrideRef.current && elapsed >= nextSwitchAtRef.current) {
        advanceAutoCycle()
      }

      /* Elke kleurwissel hertekent zes grote, zwaar geblurde lagen. 25 keer per
         seconde is ruim genoeg voor een wandeling van 9 graden per seconde, en
         een zwaai van een paar graden per minuut heeft nog veel minder nodig.
         Een crossfade krijgt een korter interval zodat de blend zelf vloeiend
         leest. */
      const interval = blendRef.current ? 60 : PRESETS[presetRef.current]?.auto ? 40 : 160
      if (now - lastPaintRef.current >= interval) {
        lastPaintRef.current = now
        paint()
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    const start = () => {
      if (frameRef.current !== null || document.visibilityState === 'hidden') return
      /* Terug van een verborgen tabblad: zonder deze reset zou de eerste
         sample ná het hervatten het hele verborgen interval (soms minuten)
         als één framegat doorgeven aan de watchdog, en dat kan een verder
         prima machine onterecht als traag bestempelen. */
      watchdog.reset()
      frameRef.current = requestAnimationFrame(tick)
    }

    const stop = () => {
      if (frameRef.current === null) return
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    const onVisibilityChange = () => {
      const hidden = document.visibilityState === 'hidden'
      setTabHidden(hidden)
      if (hidden) stop()
      else start()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    setTabHidden(document.visibilityState === 'hidden')
    start()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      watchdog.dispose()
      stop()
    }
  }, [paint, reduceMotion, staticFrame])

  /* Voor render-consumers (AuroraStage, het playground-paneel) — dezelfde
     merge als getEffectivePreset() hierboven, maar op de React-state versie
     van override/activePreset in plaats van de refs, zodat dit meerendert
     wanneer die veranderen. */
  const effectivePreset = useMemo(
    () => applyOverride(PRESETS[activePreset] ?? PRESETS[0], override),
    [activePreset, override],
  )

  const value = useMemo<AuroraContextValue>(
    () => ({
      presets: PRESETS,
      activePreset,
      selectPreset: switchPreset,
      reducedQuality,
      tabHidden,
      override,
      setOverride,
      effectivePreset,
    }),
    [activePreset, switchPreset, reducedQuality, tabHidden, override, setOverride, effectivePreset],
  )

  return <AuroraContext.Provider value={value}>{children}</AuroraContext.Provider>
}
