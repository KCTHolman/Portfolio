'use client'

/* ==========================================================================
   Het logboek: één run door de pijplijn, stap voor stap onthuld — en bij een
   poort staat hij écht stil tot de bezoeker goedkeurt.

   De state zat eerder als data-attributen op de DOM en werd door een render()
   heen en weer geschreven. Hier is het gewone React-state, en de attributen
   die overblijven (data-shown, data-last, data-waiting, data-depth) zijn puur
   CSS-haken — widget.css hangt daaraan, dus die blijven.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { usePrefersReducedMotion } from '@/lib/use-media-query'
import { RUN_STEPS, RUN_TOTAL } from './run-data'
import { ShowcaseFoot } from './showcase-foot'

const IDEA_TEXT = 'Ik wil in mijn app bij gaan houden hoeveel koffie ik drink op een dag'

const PLAY_LABEL = 'Speel de run'
const RUNNING_LABEL = 'de run loopt…'
const WAITING_LABEL = 'wacht op jou…'

/** Na een goedkeuring even wachten voor de volgende stap komt, zodat de klik
 *  een moment krijgt in plaats van meteen weggeschoven te worden. */
const RESUME_MS = 1200

const GATE_STEPS = RUN_STEPS.map((step, i) => ({ step, i })).filter(({ step }) => step.gate)

export function RunLog({ onComplete }: { onComplete?: () => void }) {
  const reduceMotion = usePrefersReducedMotion()

  /** Hoeveel stappen er zichtbaar zijn. 0 terwijl het idee nog getypt wordt. */
  const [shown, setShown] = useState(RUN_TOTAL)
  const [playing, setPlaying] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [typing, setTyping] = useState(false)
  const [typedText, setTypedText] = useState(IDEA_TEXT)
  const [depth, setDepth] = useState<'verhaal' | 'tech'>('verhaal')
  /** Eenmalige afwijking op de dwell — gebruikt na een goedkeuring. */
  const [resumeDelay, setResumeDelay] = useState<number | null>(null)

  /* Zonder JS staat de hele run er gewoon; dsv-nojs verbergt dan de knoppen
     die toch niets zouden doen. Na hydration mag alles aan. */
  const [interactive, setInteractive] = useState(false)

  const logRef = useRef<HTMLOListElement>(null)
  const lastEntryRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    setInteractive(true)
    setShown(0)
    setPlaying(true)
    setTyping(true)
    setTypedText('')
  }, [])

  /* ---------- het idee dat ingetypt wordt -------------------------------- */

  useEffect(() => {
    if (!typing) return

    if (reduceMotion) {
      setTypedText(IDEA_TEXT)
      setTyping(false)
      setShown(1)
      return
    }

    let i = 0
    let timer = 0

    const step = () => {
      i += 1
      setTypedText(IDEA_TEXT.slice(0, i))
      if (i < IDEA_TEXT.length) {
        // Een haartje variatie per teken leest als typen in plaats van als een ticker.
        timer = window.setTimeout(step, 30 + (i % 5) * 9)
        return
      }
      timer = window.setTimeout(() => {
        setTyping(false)
        setShown(1)
      }, 1100)
    }

    timer = window.setTimeout(step, 0)
    return () => window.clearTimeout(timer)
  }, [reduceMotion, typing])

  /* ---------- de run ------------------------------------------------------ */

  const advance = useCallback(() => {
    setShown((current) => {
      if (current >= RUN_TOTAL) return current
      const next = RUN_STEPS[current]
      setWaiting(Boolean(next.gate))
      return current + 1
    })
  }, [])

  useEffect(() => {
    if (!playing || waiting || typing || shown === 0) return

    if (shown >= RUN_TOTAL) {
      setPlaying(false)
      return
    }

    const delay = resumeDelay ?? RUN_STEPS[shown - 1].dwell
    const timer = window.setTimeout(() => {
      setResumeDelay(null)
      advance()
    }, delay)
    return () => window.clearTimeout(timer)
  }, [advance, playing, resumeDelay, shown, typing, waiting])

  /* De run is uit: alles wat op de release wachtte mag nu tevoorschijn komen. */
  const completed = shown >= RUN_TOTAL
  useEffect(() => {
    if (completed) onComplete?.()
  }, [completed, onComplete])

  /* Weggaan van de pagina midden in een run zou de keten van timers anders
     levend houden. */
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') setPlaying(false)
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

  const play = useCallback(() => {
    setResumeDelay(null)
    setShown(0)
    setWaiting(false)
    setPlaying(true)
    setTypedText('')
    setTyping(true)
  }, [])

  /** Voor wie sneller leest dan de run: meteen door naar de volgende stap en
   *  de dwell daarvandaan opnieuw. Een poort is niet over te slaan —
   *  Goedkeuren is de enige weg erlangs, en dat is het hele punt. */
  const next = useCallback(() => {
    if (waiting || shown >= RUN_TOTAL) return
    setResumeDelay(null)
    setPlaying(true)
    advance()
  }, [advance, shown, waiting])

  const showAll = useCallback(() => {
    setResumeDelay(null)
    setTyping(false)
    setTypedText(IDEA_TEXT)
    setShown(RUN_TOTAL)
    setWaiting(false)
    setPlaying(false)
  }, [])

  const approve = useCallback(() => {
    setWaiting(false)
    setPlaying(true)
    setResumeDelay(RESUME_MS)
  }, [])

  const toggleDepth = useCallback(() => {
    setDepth((current) => (current === 'tech' ? 'verhaal' : 'tech'))
  }, [])

  /* ---------- render ------------------------------------------------------- */

  const lastStep = RUN_STEPS[Math.max(0, shown - 1)]
  const playLabel = waiting ? WAITING_LABEL : playing ? RUNNING_LABEL : PLAY_LABEL

  const rootClassName = ['dsv', interactive ? '' : 'dsv-nojs'].filter(Boolean).join(' ')

  return (
    <section
      className={rootClassName}
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
                {GATE_STEPS.map(({ step, i }) => (
                  <span
                    key={step.t}
                    className="dsv-rail-tick"
                    style={{ '--p': `${step.p}%` } as CSSProperties}
                    {...(i < shown ? { 'data-reached': '' } : {})}
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
                  <li
                    key={step.t}
                    ref={isLast ? lastEntryRef : undefined}
                    className="dsv-entry"
                    data-who={step.who}
                    {...(step.gate ? { 'data-gate': '' } : {})}
                    {...(isShown ? { 'data-shown': '' } : {})}
                    {...(isLast ? { 'data-last': '' } : {})}
                    {...(step.gate && isLast && waiting ? { 'data-waiting': '' } : {})}
                  >
                    <div className="dsv-entry-head">
                      <span className="dsv-entry-t">{step.t}</span>
                      <span className="dsv-entry-who">{step.who}</span>
                      <span className="dsv-entry-title">{step.title}</span>
                    </div>
                    <p className="dsv-entry-detail">{step.detail}</p>
                    {step.extra}
                    {step.tech ? (
                      <p className="dsv-entry-tech">
                        <span className="dsv-tech-label">backend</span>
                        {step.tech}
                      </p>
                    ) : null}
                    {step.fail ? (
                      <p className="dsv-entry-fail">
                        <span className="dsv-fail-label">als het misgaat</span>
                        {step.fail}
                      </p>
                    ) : null}
                    {step.gate ? (
                      <div className="dsv-entry-act">
                        <button type="button" className="dsv-approve" onClick={approve}>
                          Goedkeuren &rarr;
                        </button>
                        <span className="dsv-entry-wait">de pijplijn staat stil tot je klikt</span>
                      </div>
                    ) : null}
                  </li>
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
                disabled={waiting || shown >= RUN_TOTAL}
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
