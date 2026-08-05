'use client'

/* ==========================================================================
   Cafeïne-demo — de staat.

   Een werkende namaak van het log-sheet uit BiohackOS: tik een snelkeuze en
   het komt in het dagoverzicht. De waarschuwing erboven staat er altijd, maar
   zegt iets anders naar gelang het tijdstip van de bezoeker.

   Paneel en sheet staan los van elkaar in de boom — het sheet moet buiten
   <main> blijven, want die heeft een eigen stacking context — dus de staat
   zit hier in plaats van in een van de twee.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'

import { nowHours, totalMg, warningFor, type LogEntry, type Warning } from '@/lib/caffeine'

export type Tab = 'cafeine' | 'water'

type DemoContextValue = {
  entries: LogEntry[]
  total: number
  warning: Warning
  /** De watertab is er om te laten zien dat het sheet meer doet dan koffie;
   *  de melding hangt aan cafeïne, dus die verdwijnt daar. */
  showWarning: boolean
  tab: Tab
  selectTab: (tab: Tab) => void
  manual: string
  setManual: (value: string) => void
  manualRef: RefObject<HTMLInputElement | null>
  sheetOpen: boolean
  openSheet: () => void
  closeSheet: () => void
  add: (name: string, mg: number) => void
  logManual: () => void
  reset: () => void
  /** Op slot tot de run z'n release gehaald heeft. Zonder JS nooit op slot. */
  locked: boolean
  revealed: boolean
  /** Door de run aangeroepen zodra de release binnen is. */
  unlock: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext)
  if (!value) throw new Error('useDemo moet binnen <DemoProvider> gebruikt worden')
  return value
}

/** Gelogd is klaar. Even laten staan: je wilt de regel nog zien landen en de
 *  melding zien bijstellen voor het scherm wegschuift. */
const CLOSE_AFTER_LOG_MS = 1400

/** Even wachten na de release: de sectie eronder verschijnt ook nog. */
const OPEN_AFTER_REVEAL_MS = 700

export function DemoProvider({ children }: { children: ReactNode }) {
  /* Staat er een run op deze pagina, dan is dit scherm de ontknoping ervan en
     hoort het er pas te zijn zodra die run z'n release gehaald heeft. */
  const [unlocked, setUnlocked] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('cafeine')
  const [manual, setManual] = useState('')
  /** De klok van de bezoeker, pas bekend na hydration. */
  const [hour, setHour] = useState<number | null>(null)
  /* Zonder JS is er geen run die dit scherm vrijgeeft, dus dan hoort het er
     gewoon te staan. Pas na hydration mag het op slot tot de release. */
  const [interactive, setInteractive] = useState(false)

  const nextId = useRef(0)
  const manualRef = useRef<HTMLInputElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)

  const openSheet = useCallback(() => setSheetOpen(true), [])
  const closeSheet = useCallback(() => setSheetOpen(false), [])

  /* Zonder JS valt er niets te openen, dus demo.css verbergt het sheet tot
     deze vlag er staat. */
  useEffect(() => {
    document.body.setAttribute('data-sheet', '')
    setInteractive(true)
    setHour(nowHours())
    return () => {
      document.body.removeAttribute('data-sheet')
      window.clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!unlocked) return
    const timer = window.setTimeout(openSheet, OPEN_AFTER_REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [openSheet, unlocked])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeSheet])

  const add = useCallback((name: string, mg: number) => {
    if (!mg) return
    const at = nowHours()
    nextId.current += 1
    setEntries((current) => [...current, { id: nextId.current, name, mg, at }])
    setHour(at)

    /* Sluiten hangt aan de handeling, niet aan de staat: een sheet dat je
       later zelf weer opent hoort te blijven staan. */
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setSheetOpen(false), CLOSE_AFTER_LOG_MS)
  }, [])

  const logManual = useCallback(() => {
    const mg = Number.parseInt(manual, 10)
    if (!Number.isFinite(mg) || mg <= 0) {
      manualRef.current?.focus()
      return
    }
    add('Handmatig', mg)
    setManual('')
  }, [add, manual])

  const reset = useCallback(() => setEntries([]), [])
  const selectTab = useCallback((next: Tab) => setTab(next), [])
  const unlock = useCallback(() => setUnlocked(true), [])

  const value = useMemo<DemoContextValue>(() => {
    return {
      entries,
      total: totalMg(entries),
      warning: warningFor(entries, hour),
      showWarning: tab === 'cafeine',
      tab,
      selectTab,
      manual,
      setManual,
      manualRef,
      sheetOpen,
      openSheet,
      closeSheet,
      add,
      logManual,
      reset,
      locked: interactive && !unlocked,
      revealed: unlocked,
      unlock,
    }
  }, [
    add,
    closeSheet,
    entries,
    hour,
    interactive,
    logManual,
    manual,
    openSheet,
    reset,
    selectTab,
    sheetOpen,
    tab,
    unlock,
    unlocked,
  ])

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}
