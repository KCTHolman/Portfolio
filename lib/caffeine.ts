/* ==========================================================================
   De rekenkern van de cafeïne-demo.

   De halfwaardetijd is het hele punt van de melding: het is niet "je drinkt
   veel", het is "dit werkt vanavond nog door". Wat je om 21:00 drinkt, zit om
   23:00 nog voor ~78% in je systeem.
   ========================================================================== */

/** Uur. */
export const HALF_LIFE = 5.5
/** Uur. */
export const BEDTIME = 23
/** Milligram per dag — de gangbare richtlijn. */
export const LIMIT = 400
/** Vanaf dit uur gaat de melding over slapen in plaats van over hoeveelheid. */
export const EVENING = 17

export type LogEntry = {
  id: number
  name: string
  mg: number
  /** Tijdstip als decimaal uur, bijvoorbeeld 14.5 voor 14:30. */
  at: number
}

export type WarnLevel = 'rustig' | 'dag' | 'avond'

export type Warning = {
  level: WarnLevel
  text: string
}

/** Het huidige tijdstip als decimaal uur. Alleen client-side aan te roepen. */
export function nowHours(): number {
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

export function clock(h: number): string {
  let hh = Math.floor(h)
  let mm = Math.round((h - hh) * 60)
  if (mm === 60) {
    hh += 1
    mm = 0
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function totalMg(entries: readonly LogEntry[]): number {
  return entries.reduce((a, e) => a + e.mg, 0)
}

/** Wat er van een dosis over is op een later uur. */
export function leftAt(mg: number, from: number, at: number): number {
  const hours = Math.max(0, at - from)
  return mg * Math.pow(0.5, hours / HALF_LIFE)
}

export function atBedtime(entries: readonly LogEntry[]): number {
  return entries.reduce((a, e) => a + leftAt(e.mg, e.at, BEDTIME), 0)
}

/**
 * De melding boven het dagoverzicht.
 *
 * `hour` is null zolang de klok van de bezoeker nog niet gelezen is — op de
 * server bestaat die niet, en een gok daar zou de eerste client-render laten
 * afwijken van de HTML.
 */
export function warningFor(entries: readonly LogEntry[], hour: number | null): Warning {
  const total = totalMg(entries)

  if (hour === null) {
    return { level: 'rustig', text: 'Nog niets gelogd vandaag.' }
  }

  const evening = hour >= EVENING
  const rest = Math.round(atBedtime(entries))

  if (!total) {
    return {
      level: 'rustig',
      text: evening
        ? 'Nog niets gelogd. Wat je nu nog drinkt, zit rond bedtijd voor het grootste deel nog in je systeem — de halfwaardetijd is ongeveer 5,5 uur.'
        : `Nog niets gelogd vandaag. Vanaf ${LIMIT} mg wordt het merkbaar, en alles van na een uur of vijf telt vanavond nog mee.`,
    }
  }

  const last = entries[entries.length - 1]

  if (evening) {
    const pct = Math.round((rest / total) * 100)
    return {
      level: 'avond',
      text: `Laatste cafeïne om ${clock(last.at)}. Bij een halfwaardetijd van ~5,5 uur zit er rond bedtijd nog zo'n ${pct}% in je systeem — ${rest} mg. Dat kan je slaap verstoren.`,
    }
  }

  if (total >= LIMIT) {
    return {
      level: 'avond',
      text: `Je zit op ${total} mg, boven de richtlijn van ${LIMIT} mg. Rond bedtijd is daar nog ${rest} mg van over — dat is genoeg om je slaap ondieper te maken.`,
    }
  }

  return {
    level: 'dag',
    text: `Je zit op ${total} mg van de ${LIMIT} mg. Het stapelt door: rond bedtijd zit er hiervan nog ${rest} mg in je systeem.`,
  }
}
