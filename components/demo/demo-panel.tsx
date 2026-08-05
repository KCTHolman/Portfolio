'use client'

/* Het ding waar de run hierboven over ging, als werkende namaak van het
   scherm uit de app zelf. */

import { clock } from '@/lib/caffeine'
import { useDemo } from './demo-context'
import { DemoWarning } from './demo-warning'

export function DemoPanel() {
  const { entries, total, openSheet, reset, locked, revealed } = useDemo()

  return (
    <section
      className={revealed ? 'kh-demo is-revealed' : 'kh-demo'}
      {...(locked ? { 'data-locked': '' } : {})}
      aria-labelledby="demo-titel"
    >
      <div className="kh-demo-intro">
        <p className="kh-eyebrow">Zojuist live</p>
        <h2 className="kh-demo-title" id="demo-titel">
          Probeer het zelf
        </h2>
        <p className="kh-demo-lead">
          Dit is het scherm zoals het in de app zit: tik een snelkeuze en het staat er. Geen kopjes
          maar milligrammen, koffie naast thee en cola, en boven alles een melding die meerekent.
        </p>
        <p className="kh-demo-note">
          De melding is de reden dat dit meer is dan een teller. Cafe&iuml;ne heeft een
          halfwaardetijd van ongeveer 5,5 uur, dus wat je om negen uur &#39;s avonds drinkt zit om
          elf uur nog voor bijna 80% in je systeem. Overdag gaat de melding daarom over de
          hoeveelheid, later op de avond over je slaap &mdash; die tekst hangt aan de klok van je
          eigen apparaat.
        </p>

        <div className="kh-today">
          <div className="kh-today-head">
            <span>Vandaag</span>
            <span className="kh-today-total">{total} mg</span>
          </div>

          <ol className="kh-today-list">
            {entries.length === 0 ? (
              <li className="kh-today-empty">Nog niets gelogd.</li>
            ) : (
              entries.map((entry) => (
                <li key={entry.id} className="kh-entry">
                  <span className="kh-entry-time">{clock(entry.at)}</span>
                  <span className="kh-entry-name">{entry.name}</span>
                  <span className="kh-entry-mg">{entry.mg} mg</span>
                </li>
              ))
            )}
          </ol>

          <DemoWarning variant="page" />

          <div className="kh-today-actions">
            <button type="button" className="kh-open" onClick={openSheet}>
              Open het scherm
            </button>
            <button type="button" className="kh-reset" onClick={reset}>
              Begin opnieuw
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
