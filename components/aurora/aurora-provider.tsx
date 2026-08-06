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
   ========================================================================== */

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
  blendFrames,
  bloomAt,
  computeFrame,
  hsla,
  type AuroraPreset,
} from '@/lib/aurora'
import { usePrefersReducedMotion } from '@/lib/use-media-query'

type AuroraContextValue = {
  presets: readonly AuroraPreset[]
  activePreset: number
  selectPreset: (index: number) => void
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

/** Hoeveel de zes blobs bij het laden opzij mogen staan van hun vaste
 *  CSS-positie, in procent van het schildervlak — één keer geloot per
 *  sessie (net als de preset hierboven), niet iets dat blijft lopen. Klein
 *  genoeg dat het oog "vandaag net weer even anders" leest, niet "de layout
 *  is stuk": de bestaande spin/drift-animaties bewegen de blobs toch al
 *  veel verder dan dit tijdens het kijken. */
const BLOB_COUNT = 6
const SHIFT_RANGE_PCT = 3

type StoredSession = {
  preset: number
  t0: number
  nextSwitchAt: number
  /** [jx1, jy1, jx2, jy2, ...] — zie BLOB_COUNT/SHIFT_RANGE_PCT hierboven. */
  shift: number[]
}

function randomBlobShift(): number[] {
  return Array.from({ length: BLOB_COUNT * 2 }, () => (Math.random() * 2 - 1) * SHIFT_RANGE_PCT)
}

function applyBlobShift(shift: number[]): void {
  const root = document.documentElement
  for (let i = 0; i < BLOB_COUNT; i++) {
    root.style.setProperty(`--aur-jx-${i + 1}`, `${(shift[i * 2] ?? 0).toFixed(2)}%`)
    root.style.setProperty(`--aur-jy-${i + 1}`, `${(shift[i * 2 + 1] ?? 0).toFixed(2)}%`)
  }
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

  const presetRef = useRef(0)
  const startedAtRef = useRef(0)
  const nextSwitchAtRef = useRef(AUTO_CYCLE_SEC)
  const shiftRef = useRef<number[]>([])
  const blendRef = useRef<{ from: number; startElapsed: number } | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastPaintRef = useRef(0)

  /* Reduced motion ziet de loop nooit, en krijgt het afgemaakte beeld meteen
     in plaats van eeuwig op het openingsframe te blijven staan. */
  const staticFrame = reduceMotion

  const paint = useCallback(() => {
    const root = document.documentElement
    const elapsed = (Date.now() - startedAtRef.current) / 1000
    const bloom = staticFrame ? 1 : bloomAt(elapsed)

    let frame = computeFrame(presetRef.current, elapsed, bloom)

    const blend = blendRef.current
    if (blend) {
      const t = Math.min(1, (elapsed - blend.startElapsed) / BLEND_SEC)
      const k = t * t * (3 - 2 * t)
      frame = blendFrames(computeFrame(blend.from, elapsed, bloom), frame, k)
      if (t >= 1) blendRef.current = null
    }

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
      if (index === presetRef.current && !blendRef.current) return

      const elapsed = (Date.now() - startedAtRef.current) / 1000
      blendRef.current = staticFrame ? null : { from: presetRef.current, startElapsed: elapsed }
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
        shift: shiftRef.current,
      })
    },
    [paint, staticFrame],
  )

  /* ---------- sessie oppakken -------------------------------------------- */

  useEffect(() => {
    const now = Date.now()
    startedAtRef.current = now

    const saved = readSession()
    /* Geen sessie: een willekeurige preset. Dat toeval hoort hier en niet in
       de module-scope — daar zou het per render verschillen tussen server en
       client. */
    let preset = Math.floor(Math.random() * PRESETS.length)
    let shift = randomBlobShift()

    if (saved) {
      const i = Number(saved.preset)
      // Geklemd: een opgeslagen index overleeft het verwijderen van een preset.
      if (Number.isFinite(i)) preset = Math.min(PRESETS.length - 1, Math.max(0, Math.trunc(i)))

      const when = Number(saved.t0)
      if (Number.isFinite(when) && when > 0 && when <= now) startedAtRef.current = when

      const next = Number(saved.nextSwitchAt)
      if (Number.isFinite(next) && next > 0) nextSwitchAtRef.current = next

      // Zelfde lengte-check als preset hierboven: een oudere sessie (van vóór
      // deze BLOB_COUNT) mag niet met te weinig waarden toegepast worden.
      if (Array.isArray(saved.shift) && saved.shift.length === BLOB_COUNT * 2 && saved.shift.every(Number.isFinite)) {
        shift = saved.shift
      }
    }

    presetRef.current = preset
    shiftRef.current = shift
    setActivePreset(preset)
    applyBlobShift(shift)
    paint()
    writeSession({
      preset,
      t0: startedAtRef.current,
      nextSwitchAt: nextSwitchAtRef.current,
      shift,
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

    const tick = (now: number) => {
      if (cancelled) return

      const elapsed = (Date.now() - startedAtRef.current) / 1000
      if (!reduceMotion && elapsed >= nextSwitchAtRef.current) {
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
      frameRef.current = requestAnimationFrame(tick)
    }

    const stop = () => {
      if (frameRef.current === null) return
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stop()
      else start()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    start()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stop()
    }
  }, [paint, reduceMotion, staticFrame])

  const value = useMemo<AuroraContextValue>(
    () => ({ presets: PRESETS, activePreset, selectPreset: switchPreset }),
    [activePreset, switchPreset],
  )

  return <AuroraContext.Provider value={value}>{children}</AuroraContext.Provider>
}
