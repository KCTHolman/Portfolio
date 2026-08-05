import { RUN_STEPS, RUN_TOTAL } from './run-data'

export const IDEA_TEXT = 'Ik wil in mijn app bij gaan houden hoeveel koffie ik drink op een dag'

/** Na een goedkeuring even wachten voor de volgende stap komt, zodat de klik
 *  een moment krijgt in plaats van meteen weggeschoven te worden. */
export const RESUME_MS = 1200

export type RunState = {
  /** Hoeveel stappen er zichtbaar zijn. 0 terwijl het idee nog getypt wordt. */
  shown: number
  playing: boolean
  typing: boolean
  typedText: string
  /** Tot hoever de poorten goedgekeurd zijn. Hieruit volgt of de run wacht —
   *  dat is afgeleid en geen eigen state, want twee bronnen voor hetzelfde
   *  feit lopen vroeg of laat uit elkaar. */
  approvedGates: number
  /** Eenmalige afwijking op de dwell, gebruikt na een goedkeuring. */
  resumeDelay: number | null
}

export type RunAction =
  | { type: 'start' }
  | { type: 'typed'; text: string }
  | { type: 'typingDone' }
  | { type: 'advance' }
  | { type: 'approve' }
  | { type: 'showAll' }
  | { type: 'pause' }

/** Zonder JS — en dus in de HTML die de server oplevert — staat de hele run
 *  er gewoon, uitgeklapt en zonder poorten die iets tegenhouden. */
export const INITIAL_RUN_STATE: RunState = {
  shown: RUN_TOTAL,
  playing: false,
  typing: false,
  typedText: IDEA_TEXT,
  approvedGates: RUN_TOTAL,
  resumeDelay: null,
}

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'start':
      return {
        shown: 0,
        playing: true,
        typing: true,
        typedText: '',
        approvedGates: 0,
        resumeDelay: null,
      }

    case 'typed':
      return { ...state, typedText: action.text }

    case 'typingDone':
      return { ...state, typing: false, typedText: IDEA_TEXT, shown: 1 }

    case 'advance': {
      if (state.shown >= RUN_TOTAL) return { ...state, playing: false, resumeDelay: null }
      const shown = state.shown + 1
      return { ...state, shown, playing: shown < RUN_TOTAL, resumeDelay: null }
    }

    case 'approve':
      return { ...state, approvedGates: state.shown, playing: true, resumeDelay: RESUME_MS }

    case 'showAll':
      return {
        shown: RUN_TOTAL,
        playing: false,
        typing: false,
        typedText: IDEA_TEXT,
        approvedGates: RUN_TOTAL,
        resumeDelay: null,
      }

    case 'pause':
      return { ...state, playing: false }
  }
}

/** De run staat stil als de laatst getoonde stap een poort is die nog niet
 *  goedgekeurd is. */
export function isWaiting(state: RunState): boolean {
  if (state.shown === 0) return false
  return Boolean(RUN_STEPS[state.shown - 1]?.gate) && state.approvedGates < state.shown
}
