'use client'

/* Eén keer per sessie, weg te klikken, en alleen daar waar de wash echt
   stilstaat — een duwtje richting de vollere ervaring, geen gezeur. */

import { useCallback, useEffect, useState } from 'react'

import { useNarrowScreen } from '@/lib/use-media-query'

const TOAST_KEY = 'kh-aurora-toast'
const VISIBLE_MS = 7000
const FADE_MS = 400

export function AuroraToast() {
  const narrowScreen = useNarrowScreen()
  const [state, setState] = useState<'hidden' | 'shown' | 'leaving'>('hidden')

  useEffect(() => {
    if (!narrowScreen) return

    try {
      if (sessionStorage.getItem(TOAST_KEY)) return
      sessionStorage.setItem(TOAST_KEY, '1')
    } catch {
      // Private mode of een volle quota: de hint overslaan is beter dan hem
      // eeuwig blijven herhalen.
      return
    }

    setState('shown')
    const timer = window.setTimeout(() => setState('leaving'), VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [narrowScreen])

  useEffect(() => {
    if (state !== 'leaving') return
    const timer = window.setTimeout(() => setState('hidden'), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [state])

  const dismiss = useCallback(() => setState('leaving'), [])

  if (state === 'hidden') return null

  return (
    <div className={`aur-toast${state === 'leaving' ? ' aur-toast--out' : ''}`} role="status">
      <p className="aur-toast-text">
        Voor de volle, bewegende achtergrond is desktop mooier &mdash; hier staat hij stil voor een
        vlotte ervaring.
      </p>
      <button type="button" className="aur-toast-close" aria-label="Sluiten" onClick={dismiss}>
        &times;
      </button>
    </div>
  )
}
