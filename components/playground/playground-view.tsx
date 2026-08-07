'use client'

/* ==========================================================================
   /playground/ — de vloot losgekoppeld van elke pagina.

   Elders bepaalt de context welke Fleet-variant er staat (hero op de
   homepage, journey op /werk/, showcase op /koen-holman/). Hier kies je 'm
   zelf: dezelfde zeven standen, één knoppenrij. journey krijgt er als enige
   twee bedieningen bij, omdat dat de enige variant is die iets van buitenaf
   nodig heeft (progressRef, optioneel githubHoverRef) in plaats van op zijn
   eigen klok te draaien.
   ========================================================================== */

import { useRef, useState } from 'react'

import { DirectionalTransition } from '@/components/directional-transition'
import { Fleet } from '@/components/fleet-lazy'
import type { FleetVariant } from '@/lib/use-fleet-scene'

import '@/app/styles/playground.css'

const VARIANTS: { variant: FleetVariant; label: string }[] = [
  { variant: 'hero', label: 'hero' },
  { variant: 'ambient', label: 'ambient' },
  { variant: 'showcase', label: 'showcase' },
  { variant: 'journey', label: 'journey' },
  { variant: 'home-compass', label: 'home-compass' },
  { variant: 'home-gear', label: 'home-gear' },
  { variant: 'home-rocket', label: 'home-rocket' },
]

export function PlaygroundView() {
  const [variant, setVariant] = useState<FleetVariant>('hero')
  const [progress, setProgress] = useState(2.5)
  const [githubHover, setGithubHover] = useState(false)

  /* Ref, niet alleen state: draw() in lib/use-fleet-scene.ts leest deze twee
     elk frame en heeft geen render nodig om de vorm te laten meebewegen. */
  const progressRef = useRef(progress)
  const githubHoverRef = useRef(githubHover)

  return (
    <>
      {variant === 'journey' ? (
        <Fleet variant="journey" progressRef={progressRef} githubHoverRef={githubHoverRef} />
      ) : (
        <Fleet variant={variant} />
      )}

      <DirectionalTransition>
        <main className="kh-main kh-main--playground" id="inhoud">
          <section style={{ maxWidth: '560px' }}>
            <p className="kh-eyebrow">Playground</p>
            <h1 className="kh-page-title">
              De vloot, los van <span className="kh-accent">context</span>
            </h1>
            <p className="kh-lead">
              Dezelfde zeven standen die elders vastliggen aan een pagina, hier vrij te kiezen. Geen
              inhoud eromheen, alleen de vorm zelf.
            </p>

            <div className="kh-pg-group" role="group" aria-label="Fleet-variant">
              {VARIANTS.map((item) => (
                <button
                  key={item.variant}
                  type="button"
                  className="kh-pg-btn"
                  aria-pressed={variant === item.variant}
                  onClick={() => setVariant(item.variant)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {variant === 'journey' && (
              <div className="kh-pg-panel">
                <label className="kh-pg-field">
                  <span>
                    progress <code>{progress.toFixed(2)}</code>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.01}
                    value={progress}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      progressRef.current = next
                      setProgress(next)
                    }}
                  />
                </label>
                <label className="kh-pg-toggle">
                  <input
                    type="checkbox"
                    checked={githubHover}
                    onChange={(event) => {
                      const next = event.target.checked
                      githubHoverRef.current = next
                      setGithubHover(next)
                    }}
                  />
                  raket-hover (githubHoverRef)
                </label>
              </div>
            )}
          </section>
        </main>
      </DirectionalTransition>
    </>
  )
}
