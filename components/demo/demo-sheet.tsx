'use client'

/* Het bottom sheet. Hoort buiten <main> te staan: die heeft z-index 1 en dus
   een eigen stacking context, waardoor het sheet er nooit bovenuit zou kunnen
   komen. */

import { useDemo, type Tab } from './demo-context'
import { DemoWarning } from './demo-warning'

type Quick = {
  name: string
  mg: number
  icon: string
  label: string
}

const QUICK: Record<Tab, Quick[]> = {
  cafeine: [
    { name: 'Kopje koffie', mg: 80, icon: '☕', label: 'Kopje koffie · 80 mg' },
    { name: 'Mok koffie', mg: 200, icon: '☕', label: 'Mok koffie (300 ml) · 200 mg' },
    { name: 'Espresso', mg: 63, icon: '☕', label: 'Espresso · 63 mg' },
    { name: 'Dubbele espresso', mg: 126, icon: '☕', label: 'Dubbele espresso · 126 mg' },
    { name: 'Kopje thee', mg: 40, icon: '🍵', label: 'Kopje thee · 40 mg' },
    { name: 'Energiedrank', mg: 80, icon: '⚡', label: 'Energiedrank · 80 mg' },
    { name: 'Cola', mg: 32, icon: '🍰', label: 'Cola · 32 mg' },
  ],
  water: [
    { name: 'Glas water', mg: 0, icon: '💧', label: 'Glas · 250 ml' },
    { name: 'Fles water', mg: 0, icon: '💧', label: 'Fles · 500 ml' },
    { name: 'Bidon', mg: 0, icon: '💧', label: 'Bidon · 750 ml' },
  ],
}

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'cafeine', icon: '☕', label: 'Cafeïne' },
  { id: 'water', icon: '💧', label: 'Water' },
]

export function DemoSheet() {
  const { sheetOpen, closeSheet, tab, selectTab, add, manual, setManual, manualRef, logManual } =
    useDemo()

  return (
    <div className={sheetOpen ? 'kh-sheet is-open' : 'kh-sheet'}>
      <button
        type="button"
        className="kh-sheet-grip"
        aria-label="Sluit het scherm"
        onClick={closeSheet}
      />
      <h3 className="kh-sheet-title">Cafe&iuml;ne &amp; water</h3>
      <p className="kh-sheet-sub">
        Tik een snelkeuze om direct te loggen, of vul zelf een hoeveelheid in.
      </p>

      <div className="kh-tabs" role="tablist" aria-label="Wat log je">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="kh-tab"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => selectTab(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </button>
        ))}
      </div>

      <DemoWarning />

      {TABS.map((item) => (
        <div key={item.id} hidden={item.id !== tab}>
          <p className="kh-quick-label">Snelkeuze</p>
          <div className="kh-quick">
            {QUICK[item.id].map((quick) => (
              <button
                key={quick.name}
                type="button"
                className="kh-chip"
                onClick={() => add(quick.name, quick.mg)}
              >
                <span className="kh-chip-icon" aria-hidden="true">
                  {quick.icon}
                </span>{' '}
                {quick.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <p className="kh-manual-label">Handmatig</p>
      <div className="kh-manual">
        <input
          ref={manualRef}
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          placeholder="Hoeveelheid"
          aria-label="Hoeveelheid in milligram"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') logManual()
          }}
        />
      </div>
      <button type="button" className="kh-log" onClick={logManual}>
        Loggen
      </button>
    </div>
  )
}
