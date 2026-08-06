'use client'

/* ==========================================================================
   Welke van de drie homepage-scènes (vloot, kompas, raket) dit bezoek
   toont. Zelfde patroon als useAurora() in components/aurora/aurora-
   provider.tsx: begint deterministisch zodat server en client dezelfde HTML
   opleveren, loot pas in het mount-effect, en onthoudt de keuze in
   sessionStorage — navigeren binnen hetzelfde tabblad wisselt zo niet
   halverwege van scène, maar een nieuw bezoek (nieuw tabblad, nieuwe sessie)
   loot gewoon opnieuw.
   ========================================================================== */

import { useEffect, useState } from 'react'

export type HomeScene = 'fleet' | 'compass' | 'rocket'

const SCENES: readonly HomeScene[] = ['fleet', 'compass', 'rocket']
const STORE_KEY = 'kh-home-scene'

function isHomeScene(value: unknown): value is HomeScene {
  return value === 'fleet' || value === 'compass' || value === 'rocket'
}

function readSession(): HomeScene | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    return isHomeScene(raw) ? raw : null
  } catch {
    // Privémodus of een volle quota: dit bezoek loot dan gewoon telkens opnieuw.
    return null
  }
}

function writeSession(scene: HomeScene): void {
  try {
    sessionStorage.setItem(STORE_KEY, scene)
  } catch {
    // Zie readSession().
  }
}

/** Begint op 'fleet' (de bestaande, vertrouwde stand) zodat er nooit een
 *  hydration-mismatch ontstaat; het mount-effect vervangt dat meteen door de
 *  gelote of onthouden keuze. */
export function useHomeScene(): HomeScene {
  const [scene, setScene] = useState<HomeScene>('fleet')

  useEffect(() => {
    const saved = readSession()
    const picked = saved ?? SCENES[Math.floor(Math.random() * SCENES.length)]
    setScene(picked)
    if (!saved) writeSession(picked)
  }, [])

  return scene
}
