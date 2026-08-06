'use client'

/* ==========================================================================
   Op een telefoon staat de tekst boven op de scène (zie components/home-
   hero.tsx). Slepen schuift de tekst naar beneden en de scène naar boven,
   als een gordijn dat opzij gaat — en op de terugweg weer dicht. Alleen
   relevant op smalle schermen: op een groter scherm staan tekst en scène al
   naast elkaar, dus daar doet dit niets.

   Handmatige addEventListener met { passive: false } voor touchmove, niet
   React's onTouchMove-prop: die abonneert passief, waardoor preventDefault()
   geen effect zou hebben zodra de pagina toch een fractie hoger is dan de
   viewport en de browser zelf ook nog wil scrollen.

   Live tijdens het slepen staat er geen React-state te herrekenen — dertig
   keer per seconde hertekenen voor een sleepbeweging is nergens voor nodig.
   De voortgang gaat rechtstreeks als CSS-variabele op het element, hetzelfde
   "per frame imperatief" principe als de aurora-loop. Alleen de eindstand
   (geopend/dicht) is React-state: die wisselt maar twee keer per veeg.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react'

import { useNarrowScreen } from '@/lib/use-media-query'

/** Hoeveel de tekst omlaag en de scène omhoog schuiven, in pixels — genoeg
 *  om overduidelijk te zijn zonder de tekst van het scherm te drukken. */
export const SWIPE_REVEAL_PX = 190

/** Hoeveel beweging nodig is voordat een aanraking als "slepen" telt, in
 *  plaats van meteen bij de eerste pixel te beslissen — anders wordt een
 *  gewone tik op de knoppen in .kh-home-copy per ongeluk een (nul-pixel)
 *  sleep. */
const START_SLOP = 8

type TouchState = {
  id: number
  startY: number
  startX: number
  base: number
  dragging: boolean
  deciding: boolean
}

export function useSwipeReveal<T extends HTMLElement>() {
  const narrowScreen = useNarrowScreen()
  const narrowScreenRef = useRef(narrowScreen)
  const areaRef = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)
  const revealedRef = useRef(false)
  const offsetRef = useRef(0)

  useEffect(() => {
    narrowScreenRef.current = narrowScreen
    // Terug naar een breed scherm terwijl de tekst weggeschoven stond: geen
    // scène meer om voor weg te schuiven, dus terug naar normaal.
    if (!narrowScreen && revealedRef.current) setRevealed(false)
  }, [narrowScreen])

  useEffect(() => {
    revealedRef.current = revealed
    const px = revealed ? SWIPE_REVEAL_PX : 0
    offsetRef.current = px
    areaRef.current?.style.setProperty('--kh-swipe', `${px}px`)
  }, [revealed])

  useEffect(() => {
    const el = areaRef.current
    if (!el) return

    let touch: TouchState | null = null

    const setOffset = (px: number) => {
      offsetRef.current = px
      el.style.setProperty('--kh-swipe', `${px}px`)
    }

    const onStart = (e: TouchEvent) => {
      if (!narrowScreenRef.current || e.touches.length !== 1) return
      // Niet starten vanaf een link/knop: dat blijft gewoon een tik.
      if ((e.target as HTMLElement).closest('a, button')) return
      const t = e.touches[0]
      touch = {
        id: t.identifier,
        startY: t.clientY,
        startX: t.clientX,
        base: offsetRef.current,
        dragging: false,
        deciding: true,
      }
    }

    const onMove = (e: TouchEvent) => {
      if (!touch) return
      const t = Array.from(e.touches).find((x) => x.identifier === touch!.id)
      if (!t) return
      const dy = t.clientY - touch.startY
      const dx = t.clientX - touch.startX

      if (touch.deciding) {
        if (Math.abs(dy) < START_SLOP && Math.abs(dx) < START_SLOP) return
        touch.deciding = false
        // Overwegend horizontaal: geen sleep voor dit gordijn, laat de
        // aanraking verder ongemoeid (bijvoorbeeld voor een andere gebaar).
        if (Math.abs(dx) > Math.abs(dy)) {
          touch = null
          return
        }
        touch.dragging = true
        el.classList.add('kh-swipe-dragging')
      }
      if (!touch.dragging) return

      // Alleen ná de beslissing hierboven: tot die tijd blijft een gewone
      // verticale scroll (op een device waar de pagina toch iets langer is
      // dan de viewport) gewoon mogelijk.
      e.preventDefault()
      setOffset(Math.min(SWIPE_REVEAL_PX, Math.max(0, touch.base - dy)))
    }

    const onEnd = () => {
      const wasDragging = touch?.dragging ?? false
      touch = null
      if (!wasDragging) return
      el.classList.remove('kh-swipe-dragging')
      setRevealed(offsetRef.current >= SWIPE_REVEAL_PX / 2)
    }

    const onCancel = () => {
      const wasDragging = touch?.dragging ?? false
      touch = null
      if (!wasDragging) return
      el.classList.remove('kh-swipe-dragging')
      setOffset(revealedRef.current ? SWIPE_REVEAL_PX : 0)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onCancel)

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onCancel)
    }
  }, [])

  return { areaRef, revealed }
}
