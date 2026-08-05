'use client'

/* ==========================================================================
   Het logboek: één run door de pijplijn, stap voor stap onthuld — en bij een
   poort staat hij écht stil tot de bezoeker goedkeurt.

   De state zat eerder als data-attributen op de DOM en werd door een render()
   heen en weer geschreven. Hier is het één reducer; of de run wacht is
   afgeleid en geen eigen veld.
   ========================================================================== */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { usePrefersReducedMotion } from '@/lib/use-media-query'
import { RUN_STEPS, RUN_TOTAL } from './run-data'
import { RunEntry } from './run-entry'
import { IDEA_TEXT, INITIAL_RUN_STATE, isWaiting, runReducer } from './run-reducer'
import { ShowcaseFoot } from './showcase-foot'

const PLAY_LABEL = 'Speel de run'
const RUNNING_LABEL = 'de run loopt…'
const WAITING_LABEL = 'wacht op jou…'

const GATE_STEPS = RUN_STEPS.flatMap((step, index) => (step.gate ? [{ step, index }] : []))

export function RunLog({ onComplete }: { onComplete?: () => void }) {
  const reduceMotion = usePrefersReducedMotion()
  const [state, dispatch] = useReducer(runReducer, INITIAL_RUN_STATE)
  const [depth, setDepth] = useState<'verhaal' | 'tech'>('verhaal')

  /* Zonder JS staat de hele run er uitgeklapt; dsv-nojs verbergt dan de
     knoppen die toch niets zouden doen. Na hydration mag alles aan. */
  const [interactive, setInteractive] = useState(false)

  const logRef = useRef<HTMLOListElement>(null)
  const lastEntryRef = useRef<HTMLLIElement>(null)

  const { shown, playing, typing, typedText, resumeDelay } = state
  const waiting = isWaiting(state)
  const completed = shown >= RUN_TOTAL

  useEffect(() => {
    setInteractive(true)
    dispatch({ type: 'start' })
  }, [])

  /* ---------- het idee dat ingetypt wordt -------------------------------- */

  useEffect(() => {
    if (!typing) return

    if (reduceMotion) {
      dispatch({ type: 'typingDone' })
      return
    }

    let i = 0
    let timer = 0

    const step = () => {
      i += 1
      dispatch({ type: 'typed', text: IDEA_TEXT.slice(0, i) })
      if (i < IDEA_TEXT.length) {
        // Een haartje variatie per teken leest als typen in plaats van als een ticker.
        timer = window.setTimeout(step, 30 + (i % 5) * 9)
        return
      }
      timer = window.setTimeout(() => dispatch({ type: 'typingDone' }), 1100)
    }

    timer = window.setTimeout(step, 0)
    return () => window.clearTimeout(timer)
  }, [reduceMotion, typing])

  /* ---------- de run ------------------------------------------------------ */

  useEffect(() => {
    if (!playing || waiting || typing || shown === 0 || shown >= RUN_TOTAL) return

    const delay = resumeDelay ?? RUN_STEPS[shown - 1].dwell
    const timer = window.setTimeout(() => dispatch({ type: 'advance' }), delay)
    return () => window.clearTimeout(timer)
  }, [playing, resumeDelay, shown, typing, waiting])

  /* De run is uit: alles wat op de release wachtte mag nu tevoorschijn komen. */
  useEffect(() => {
    if (completed) onComplete?.()
  }, [completed, onComplete])

  /* Weggaan van de pagina midden in een run zou de keten van timers anders
     levend houden. */
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') dispatch({ type: 'pause' })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  /* Houd de nieuwste stap in beeld; het logboek scrollt in z'n eigen kader.
     Een stap die hoger is dan het kader krijgt z'n bovenkant uitgelijnd in
     plaats van z'n onderkant — naar het eind scrollen zou de lezer voorbij de
     opening zetten. */
  useEffect(() => {
    const log = logRef.current
    const last = lastEntryRef.current
    if (!log || !last) return

    const limit = log.scrollHeight - log.clientHeight
    if (last.offsetHeight > log.clientHeight) {
      const delta = last.getBoundingClientRect().top - log.getBoundingClientRect().top
      log.scrollTop = Math.min(log.scrollTop + delta, limit)
    } else {
      log.scrollTop = limit
    }
  }, [depth, shown])

  /* ---------- knoppen ------------------------------------------------------ */

  const play = useCallback(() => dispatch({ type: 'start' }), [])
  const showAll = useCallback(() => dispatch({ type: 'showAll' }), [])
  const approve = useCallback(() => dispatch({ type: 'approve' }), [])

  /** Voor wie sneller leest dan de run: meteen door naar de volgende stap en
   *  de dwell daarvandaan opnieuw. Een poort is niet over te slaan —
   *  Goedkeuren is de enige weg erlangs, en dat is het hele punt. */
  const next = useCallback(() => {
    if (waiting || completed) return
    dispatch({ type: 'advance' })
  }, [completed, waiting])

  const toggleDepth = useCallback(() => {
    setDepth((current) => (current === 'tech' ? 'verhaal' : 'tech'))
  }, [])

  /* ---------- render ------------------------------------------------------- */

  const lastStep = RUN_STEPS[Math.max(0, shown - 1)]
  const playLabel = waiting ? WAITING_LABEL : playing ? RUNNING_LABEL : PLAY_LABEL

  return (
    <section
      className={interactive ? 'dsv' : 'dsv dsv-nojs'}
      data-view="verhalend"
      data-depth={depth}
      {...(typing ? { 'data-typing': '' } : {})}
      aria-label="deSchouwVloot logboek"
    >
      <div className="dsv-glow" aria-hidden="true" />
      <div className="dsv-glow dsv-glow--b" aria-hidden="true" />

      <div className="dsv-view dsv-view--verhalend">
        <header className="dsv-header">
          <div className="dsv-intro">
            <p className="dsv-eyebrow">
              <span className="dsv-eyebrow-dot" aria-hidden="true" />
              Showcase &middot; CI/CD-infrastructuur &middot; Verhalend
            </p>
            <h3 className="dsv-title">
              Het <em>logboek</em>
            </h3>
            <p className="dsv-lead">
              E&eacute;n idee, van mijn inbox tot live. Je ziet de pijplijn onderweg meedenken
              &mdash; en op drie plekken wacht het op mij.
            </p>
          </div>
        </header>

        <div className="dsv-body">
          {/* De ticks komen uit dezelfde lijst als het logboek: elke stap die
              op een mens wacht, krijgt er een. */}
          <div className="dsv-rail" aria-hidden="true">
            <span className="dsv-rail-cap">idee</span>
            <div className="dsv-rail-track">
              <div
                className="dsv-rail-bar"
                style={{ '--dsv-fill': `${lastStep.p}%` } as CSSProperties}
              >
                <div className="dsv-rail-fill" />
                <div className="dsv-rail-dot" />
                {GATE_STEPS.map(({ step, index }) => (
                  <span
                    key={step.t}
                    className="dsv-rail-tick"
                    style={{ '--p': `${step.p}%` } as CSSProperties}
                    {...(index < shown ? { 'data-reached': '' } : {})}
                  />
                ))}
              </div>
            </div>
            <span className="dsv-rail-cap">live</span>
            <span className="dsv-rail-side">&mdash; mens</span>
          </div>

          <div className="dsv-logwrap">
            {/* Het idee zoals het de poort in getypt wordt. Zonder JS leest het
                gewoon als het issue dat het is. */}
            <div className="dsv-intake">
              <div className="dsv-intake-head">
                <span className="dsv-intake-label">nieuw issue &middot; poort</span>
                <span className="dsv-intake-repo">deSchouwVloot &middot; intake</span>
              </div>
              <p className="dsv-intake-text">
                <span className="dsv-typed">{typedText}</span>
                <span className="dsv-caret" aria-hidden="true" />
              </p>
            </div>

            <div className="dsv-log-head">
              <span className="dsv-log-title">Van idee naar release</span>
              <span className="dsv-counter">
                {shown} / {RUN_TOTAL} stappen
              </span>
            </div>

            <ol className="dsv-log" ref={logRef}>
              {RUN_STEPS.map((step, i) => {
                const isShown = i < shown
                const isLast = isShown && i === shown - 1
                return (
                  <RunEntry
                    key={step.t}
                    ref={isLast ? lastEntryRef : undefined}
                    step={step}
                    shown={isShown}
                    last={isLast}
                    waiting={waiting}
                    onApprove={approve}
                  />
                )
              })}
            </ol>

            <div className="dsv-controls">
              <button type="button" className="dsv-btn dsv-btn--play" onClick={play}>
                {playLabel}
              </button>
              <button
                type="button"
                className="dsv-btn"
                onClick={next}
                disabled={waiting || completed}
              >
                Volgende &rarr;
              </button>
              <button type="button" className="dsv-btn" onClick={showAll}>
                Alles in &eacute;&eacute;n keer
              </button>
              {/* Dezelfde run, één laag dieper: wat de backend per stap doet,
                  en wat er gebeurt als die stap faalt. */}
              <button
                type="button"
                className="dsv-btn dsv-btn--depth"
                aria-pressed={depth === 'tech'}
                onClick={toggleDepth}
              >
                {depth === 'tech' ? 'Verhalende versie' : 'Technische versie'}
              </button>
            </div>
          </div>
        </div>

        <ShowcaseFoot note={<>Logboek van &eacute;&eacute;n run &middot; publieke, gecureerde repo</>} />
      </div>
    </section>
  )
}
