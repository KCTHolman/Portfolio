'use client'

/* Scroll-hint onder de /werk/-intro: een klassieke pijl-silhouet (schacht +
   punt, geen chevron) maar opgebouwd uit dezelfde driehoekjes als de vloot
   (zie lib/fleet-geometry.ts) in plaats van een gladde vector — de rand
   dissolvet zo een beetje, net als de boot dat doet. Zweeft/ademt tot je
   zelf gaat scrollen, dissolvet dan volledig. Eenmalig — hij komt niet
   terug als je terugscrollt naar boven, dat is precies wat "start met
   scrollen" vraagt. Een drempel van een paar pixels negeert de
   rubber-band-jitter die iOS Safari al bij het laden geeft.
   In de gewone leesstroom (geen position:fixed): zo staat hij altijd in de
   lege ruimte onder de intro-alinea, nooit onder de sticky footer-balk. */

import { useEffect, useRef, useState, type CSSProperties } from 'react'

const DISMISS_THRESHOLD = 24

/* Zelfde principe als de `repel` in lib/use-fleet-scene.ts: driehoekjes
   binnen REPEL_R van de cursor worden er circelvormig vanaf geduwd, sterker
   naarmate de cursor dichterbij komt. Op deze schaal (het icoon is ~150px
   breed) een stuk kleiner dan de vloot zelf. */
const REPEL_R = 46
const REPEL_PUSH = 22
/* De vloot zelf past geen extra vertraging toe op de afstoting (die leunt
   alleen op de val-off van k*(2-k)) — dicht bij dat directe gevoel, met
   nog net genoeg easing om niet elk frame te springen. */
const REPEL_EASE = 0.32

type Mark = { pts: string; color: string; o: number; d: number }
type DispersedMark = Mark & { dx: string; dy: string }

/* Ruwe zwaartepunt van de pijl-silhouet (schacht+kop, zie MARKS hieronder) —
   het punt waar elk driehoekje bij dismiss vandaan lijkt weg te waaien. */
const ARROW_CENTER = { x: 40, y: 38 }

function centroid(pts: string): [number, number] {
  const [a, b, c] = pts.split(' ').map((p) => p.split(',').map(Number) as [number, number])
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3]
}

/* Rand + vulling van een pijl (schacht 26..54 x 0..40, kop 6..74 x 40..76),
   teal-dominant met een enkele witte en amberen vonk — dezelfde scheve
   verhouding als de vloot zelf. d = animation-delay voor de individuele
   twinkel, zodat het geheel niet in lockstep pulseert. */
const TEAL = 'var(--kh-teal)'
const TEAL_SOFT = 'var(--kh-teal-soft)'
const ASH = 'var(--kh-ash)'
const AMBER = 'var(--kh-amber)'

/* Zelfde grootte als de driehoekjes in de vloot (lib/fleet-geometry.ts:
   r ≈ 1.2..3.5px) en met vergelijkbare dichtheid — 118 stuks, rand +
   vulling van zowel de schacht als de kop, anders oogt een pijl van deze
   afmeting als een leeg lijntje in plaats van dezelfde korrelige wolk. */
const MARKS: readonly Mark[] = [
  { pts: '26.3,1.2 27.6,1.0 27.2,2.2', color: TEAL_SOFT, o: 0.77, d: 0.23 },
  { pts: '31.8,2.3 29.1,1.6 31.1,-0.3', color: TEAL, o: 0.66, d: 2.85 },
  { pts: '36.3,1.8 35.4,-0.7 38.0,-0.2', color: TEAL, o: 0.72, d: 2.3 },
  { pts: '41.1,2.3 41.3,-0.7 43.8,0.9', color: TEAL, o: 0.82, d: 0.48 },
  { pts: '48.6,-0.6 49.3,0.3 48.2,0.5', color: TEAL, o: 0.81, d: 1.78 },
  { pts: '54.8,-0.7 52.9,-1.0 54.1,-2.5', color: ASH, o: 0.86, d: 0.26 },
  { pts: '52.8,0.2 53.9,-2.3 55.5,-0.1', color: TEAL_SOFT, o: 0.9, d: 3.09 },
  { pts: '54.2,5.7 53.0,4.2 54.9,3.9', color: TEAL, o: 0.75, d: 1.83 },
  { pts: '54.8,12.6 52.2,11.3 54.6,9.7', color: TEAL_SOFT, o: 0.77, d: 0.37 },
  { pts: '53.4,15.3 55.7,16.5 53.6,17.9', color: TEAL, o: 0.63, d: 0.97 },
  { pts: '53.4,22.6 56.3,22.1 55.3,24.9', color: ASH, o: 0.8, d: 2.73 },
  { pts: '51.9,30.6 52.2,27.4 54.8,29.2', color: TEAL, o: 0.78, d: 2.37 },
  { pts: '54.8,35.5 52.6,36.5 52.9,34.1', color: TEAL, o: 0.68, d: 0.63 },
  { pts: '53.4,40.5 54.8,41.1 53.7,42.0', color: TEAL_SOFT, o: 0.58, d: 0.79 },
  { pts: '52.8,39.8 55.3,39.9 54.0,42.0', color: TEAL, o: 0.86, d: 2.57 },
  { pts: '58.6,41.6 59.4,39.9 60.5,41.4', color: TEAL, o: 0.67, d: 1.8 },
  { pts: '62.8,42.0 63.5,40.1 64.8,41.6', color: TEAL_SOFT, o: 0.75, d: 2.52 },
  { pts: '69.2,38.1 69.8,40.9 67.0,40.1', color: TEAL, o: 0.63, d: 0.67 },
  { pts: '74.1,38.3 74.6,39.1 73.7,39.2', color: TEAL_SOFT, o: 0.57, d: 0.79 },
  { pts: '73.7,39.1 75.0,40.5 73.0,40.9', color: TEAL_SOFT, o: 0.59, d: 0.84 },
  { pts: '70.8,45.1 70.1,46.9 68.8,45.4', color: TEAL_SOFT, o: 0.76, d: 3.21 },
  { pts: '66.2,50.3 65.3,51.7 64.5,50.2', color: TEAL, o: 0.71, d: 0.72 },
  { pts: '59.1,56.0 60.3,55.7 59.9,56.9', color: TEAL, o: 0.77, d: 2.28 },
  { pts: '54.9,59.7 55.3,61.5 53.5,61.0', color: TEAL, o: 0.86, d: 3.1 },
  { pts: '50.5,64.7 50.0,66.2 48.9,65.0', color: TEAL, o: 0.7, d: 1.29 },
  { pts: '45.9,69.5 46.4,71.4 44.6,71.0', color: TEAL, o: 0.56, d: 3.14 },
  { pts: '39.1,77.7 40.1,75.7 41.3,77.7', color: TEAL, o: 0.57, d: 0.06 },
  { pts: '38.4,74.5 41.1,73.9 40.3,76.5', color: TEAL, o: 0.86, d: 2.24 },
  { pts: '35.6,71.5 35.8,70.0 37.0,70.9', color: TEAL_SOFT, o: 0.63, d: 3.14 },
  { pts: '30.4,64.2 33.0,65.7 30.4,67.2', color: TEAL_SOFT, o: 0.9, d: 0.59 },
  { pts: '26.3,60.4 26.8,63.1 24.3,62.1', color: TEAL_SOFT, o: 0.82, d: 3.28 },
  { pts: '21.7,57.5 20.0,56.4 21.9,55.4', color: TEAL_SOFT, o: 0.61, d: 2 },
  { pts: '13.9,50.2 15.3,49.1 15.5,50.8', color: ASH, o: 0.77, d: 1.02 },
  { pts: '11.4,45.1 12.6,45.3 11.9,46.2', color: TEAL, o: 0.89, d: 0.71 },
  { pts: '5.9,40.3 4.8,39.8 5.9,39.1', color: TEAL_SOFT, o: 0.8, d: 2.83 },
  { pts: '6.7,38.5 7.9,40.9 5.2,40.8', color: TEAL, o: 0.85, d: 1.07 },
  { pts: '10.7,37.6 10.8,40.3 8.4,39.0', color: TEAL_SOFT, o: 0.7, d: 1.07 },
  { pts: '16.5,39.5 15.9,38.7 16.9,38.5', color: TEAL, o: 0.84, d: 1.96 },
  { pts: '19.3,41.1 19.9,40.1 20.5,41.1', color: TEAL, o: 0.77, d: 0.44 },
  { pts: '24.4,40.5 25.7,38.4 26.8,40.6', color: TEAL, o: 0.57, d: 0.67 },
  { pts: '25.9,41.9 25.6,40.7 26.8,41.0', color: TEAL, o: 0.7, d: 2.49 },
  { pts: '25.1,33.4 25.7,31.9 26.7,33.1', color: TEAL, o: 0.84, d: 2.27 },
  { pts: '25.5,29.6 24.8,27.2 27.2,27.8', color: ASH, o: 0.82, d: 2.61 },
  { pts: '27.2,24.2 26.5,22.7 28.1,22.9', color: TEAL, o: 0.69, d: 0.76 },
  { pts: '25.5,15.8 26.9,15.8 26.2,17.0', color: TEAL_SOFT, o: 0.69, d: 2.85 },
  { pts: '24.5,13.9 24.8,11.3 26.9,12.8', color: TEAL_SOFT, o: 0.71, d: 3.23 },
  { pts: '27.7,5.6 25.6,5.7 26.6,3.8', color: TEAL, o: 0.79, d: 3.26 },
  { pts: '27.1,-1.6 25.8,0.8 24.4,-1.5', color: AMBER, o: 0.63, d: 1.92 },
  { pts: '47.6,34.5 49.7,33.5 49.5,35.9', color: TEAL, o: 0.31, d: 2.23 },
  { pts: '48.1,25.5 50.2,26.1 48.6,27.6', color: TEAL, o: 0.33, d: 2.92 },
  { pts: '49.9,6.8 49.2,4.3 51.8,4.9', color: TEAL, o: 0.36, d: 2.59 },
  { pts: '52.6,14.2 54.2,15.8 52.0,16.3', color: TEAL_SOFT, o: 0.45, d: 2.74 },
  { pts: '33.5,30.4 33.2,32.6 31.4,31.3', color: TEAL_SOFT, o: 0.54, d: 2.86 },
  { pts: '50.4,22.0 52.3,22.7 50.7,24.0', color: TEAL, o: 0.41, d: 1.17 },
  { pts: '45.2,6.6 45.0,8.4 43.6,7.4', color: TEAL, o: 0.51, d: 1.07 },
  { pts: '46.1,23.2 47.8,24.0 46.3,25.0', color: TEAL_SOFT, o: 0.43, d: 2.79 },
  { pts: '39.0,26.3 38.5,28.4 37.0,26.9', color: TEAL_SOFT, o: 0.46, d: 0.79 },
  { pts: '48.5,6.7 48.5,9.3 46.2,7.9', color: TEAL, o: 0.47, d: 0.33 },
  { pts: '38.4,35.0 36.5,37.1 35.7,34.5', color: ASH, o: 0.32, d: 2.43 },
  { pts: '35.8,15.0 35.3,15.9 34.7,15.1', color: TEAL, o: 0.49, d: 1.15 },
  { pts: '33.8,13.7 34.7,13.9 34.2,14.5', color: TEAL, o: 0.29, d: 0.25 },
  { pts: '52.6,28.5 53.5,29.0 52.6,29.5', color: TEAL, o: 0.5, d: 1.49 },
  { pts: '39.6,17.4 41.6,18.6 39.6,19.6', color: AMBER, o: 0.48, d: 1.97 },
  { pts: '29.0,23.4 26.9,23.6 27.8,21.6', color: TEAL, o: 0.59, d: 0.54 },
  { pts: '40.5,34.3 42.0,35.9 39.9,36.5', color: TEAL, o: 0.29, d: 3.1 },
  { pts: '52.0,34.4 50.1,34.6 50.8,32.8', color: TEAL, o: 0.4, d: 2.98 },
  { pts: '53.4,32.6 51.2,31.8 53.0,30.3', color: TEAL, o: 0.38, d: 0.91 },
  { pts: '51.6,18.5 49.6,19.7 49.6,17.3', color: TEAL, o: 0.31, d: 0.16 },
  { pts: '40.2,24.7 38.6,25.5 38.8,23.7', color: TEAL_SOFT, o: 0.54, d: 0.48 },
  { pts: '27.9,2.6 28.7,3.8 27.4,3.9', color: TEAL_SOFT, o: 0.6, d: 1.09 },
  { pts: '26.4,9.1 27.3,8.2 27.7,9.4', color: TEAL_SOFT, o: 0.53, d: 2.61 },
  { pts: '28.0,22.3 28.9,21.1 29.6,22.5', color: TEAL_SOFT, o: 0.55, d: 1 },
  { pts: '14.3,39.9 14.7,41.0 13.6,40.8', color: TEAL, o: 0.79, d: 0.78 },
  { pts: '60.9,40.9 58.3,42.5 58.2,39.4', color: TEAL, o: 0.42, d: 3.34 },
  { pts: '49.7,61.9 49.0,60.8 50.3,60.7', color: AMBER, o: 0.58, d: 0.85 },
  { pts: '12.4,46.7 11.5,46.1 12.5,45.7', color: TEAL, o: 0.78, d: 3.17 },
  { pts: '59.3,49.2 56.9,49.0 58.3,47.1', color: TEAL_SOFT, o: 0.67, d: 1.18 },
  { pts: '37.2,59.1 34.2,60.1 34.8,57.1', color: TEAL, o: 0.48, d: 2.87 },
  { pts: '30.2,62.2 31.3,62.9 30.1,63.6', color: TEAL, o: 0.74, d: 0.8 },
  { pts: '52.3,45.2 53.8,46.6 51.8,47.2', color: TEAL_SOFT, o: 0.56, d: 0.96 },
  { pts: '62.2,48.4 63.0,49.8 61.3,49.7', color: TEAL, o: 0.73, d: 1.67 },
  { pts: '23.8,45.5 21.8,45.7 22.6,43.9', color: TEAL, o: 0.44, d: 2.27 },
  { pts: '50.3,65.6 48.6,64.4 50.5,63.6', color: ASH, o: 0.73, d: 0.47 },
  { pts: '61.5,51.4 58.4,51.1 60.2,48.5', color: AMBER, o: 0.46, d: 0.42 },
  { pts: '44.2,66.7 44.9,64.2 46.6,66.1', color: TEAL_SOFT, o: 0.78, d: 2.41 },
  { pts: '34.4,60.6 36.8,62.7 33.8,63.8', color: TEAL_SOFT, o: 0.7, d: 0.44 },
  { pts: '36.4,41.2 35.6,40.2 36.8,40.0', color: TEAL, o: 0.66, d: 1.63 },
  { pts: '49.7,42.3 46.8,42.7 47.9,40.0', color: TEAL, o: 0.7, d: 0.77 },
  { pts: '40.5,43.3 41.3,40.6 43.2,42.6', color: TEAL, o: 0.63, d: 0.68 },
  { pts: '17.1,47.6 16.7,45.8 18.5,46.4', color: TEAL, o: 0.47, d: 1.28 },
  { pts: '40.5,41.2 41.5,39.9 42.1,41.4', color: TEAL_SOFT, o: 0.58, d: 2.83 },
  { pts: '35.0,65.2 36.0,64.4 36.2,65.6', color: TEAL_SOFT, o: 0.58, d: 3.24 },
  { pts: '26.7,41.1 25.8,42.9 24.7,41.3', color: TEAL, o: 0.72, d: 0.71 },
  { pts: '46.9,44.0 49.6,43.7 48.5,46.1', color: ASH, o: 0.65, d: 1.51 },
  { pts: '61.6,50.5 59.6,49.0 61.9,48.0', color: TEAL_SOFT, o: 0.51, d: 0.5 },
  { pts: '54.5,56.8 56.0,56.6 55.4,58.1', color: AMBER, o: 0.69, d: 2.9 },
  { pts: '36.7,45.9 34.7,45.2 36.3,43.8', color: TEAL_SOFT, o: 0.5, d: 2.52 },
  { pts: '56.7,57.7 54.4,58.8 54.7,56.3', color: TEAL, o: 0.47, d: 1.78 },
  { pts: '22.5,48.2 20.1,48.8 20.8,46.4', color: ASH, o: 0.67, d: 0.2 },
  { pts: '33.5,59.6 34.0,57.5 35.6,59.0', color: TEAL, o: 0.44, d: 2.01 },
  { pts: '38.9,73.5 41.5,72.6 41.0,75.3', color: TEAL, o: 0.41, d: 0.28 },
  { pts: '34.1,68.5 36.4,68.6 35.2,70.6', color: TEAL, o: 0.59, d: 3.1 },
  { pts: '58.1,42.8 55.3,42.8 56.7,40.3', color: TEAL_SOFT, o: 0.77, d: 3.03 },
  { pts: '26.5,39.9 27.6,41.9 25.3,41.9', color: TEAL_SOFT, o: 0.48, d: 2.21 },
  { pts: '44.4,50.1 46.2,50.7 44.8,52.0', color: TEAL, o: 0.47, d: 2.64 },
  { pts: '45.5,45.2 44.3,46.7 43.6,44.9', color: AMBER, o: 0.81, d: 2.41 },
  { pts: '38.4,43.2 37.8,41.7 39.5,41.9', color: TEAL_SOFT, o: 0.6, d: 2.21 },
  { pts: '47.0,68.0 46.7,70.7 44.5,69.1', color: ASH, o: 0.58, d: 1.87 },
  { pts: '35.0,49.7 37.0,49.3 36.3,51.2', color: TEAL, o: 0.73, d: 1.96 },
  { pts: '52.1,50.7 53.5,47.9 55.2,50.5', color: TEAL, o: 0.56, d: 1.13 },
  { pts: '64.5,51.7 61.4,51.9 62.8,49.2', color: TEAL, o: 0.46, d: 1.72 },
  { pts: '42.0,48.5 44.2,48.8 42.8,50.6', color: TEAL_SOFT, o: 0.55, d: 0.39 },
  { pts: '40.0,66.2 36.9,65.5 39.1,63.1', color: TEAL_SOFT, o: 0.73, d: 1.55 },
  { pts: '31.5,50.0 31.1,53.0 28.7,51.1', color: ASH, o: 0.55, d: 2.32 },
  { pts: '24.2,49.7 23.3,50.2 23.3,49.2', color: TEAL, o: 0.81, d: 1.09 },
  { pts: '56.7,51.1 55.1,52.9 54.3,50.6', color: TEAL, o: 0.47, d: 0.21 },
  { pts: '37.3,51.5 39.9,52.0 38.2,54.1', color: TEAL, o: 0.62, d: 3 },
  { pts: '52.5,43.7 55.0,42.3 55.0,45.2', color: TEAL_SOFT, o: 0.55, d: 2.32 },
] as const

/* Per driehoekje vooraf de uitwaaier-vector berekenen (richting vanaf
   ARROW_CENTER, verder weg voor wie al verder van het midden stond) — dat
   gebeurt hier één keer bij module-load, niet per render. */
const DISPERSED_MARKS: readonly DispersedMark[] = MARKS.map((m) => {
  const [cx, cy] = centroid(m.pts)
  const dist = Math.hypot(cx - ARROW_CENTER.x, cy - ARROW_CENTER.y) || 1
  const spread = 48 + (dist / 45) * 58
  const dx = ((cx - ARROW_CENTER.x) / dist) * spread
  const dy = ((cy - ARROW_CENTER.y) / dist) * spread
  return { ...m, dx: `${dx.toFixed(1)}px`, dy: `${dy.toFixed(1)}px` }
})

export function ScrollCue() {
  const [dismissed, setDismissed] = useState(false)
  const dismissedRef = useRef(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const markRefs = useRef<(SVGPolygonElement | null)[]>([])
  const restCenters = useRef<{ x: number; y: number }[]>([])
  const current = useRef<{ x: number; y: number }[]>(DISPERSED_MARKS.map(() => ({ x: 0, y: 0 })))
  const pointer = useRef({ x: 0, y: 0, active: false })
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    function onScroll(): void {
      if (window.scrollY > DISMISS_THRESHOLD) {
        setDismissed(true)
        dismissedRef.current = true
        window.removeEventListener('scroll', onScroll)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function measureRestCenters(): void {
      restCenters.current = markRefs.current.map((el) => {
        if (!el) return { x: 0, y: 0 }
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      })
    }

    function tick(): void {
      rafId.current = null
      let settled = true

      markRefs.current.forEach((el, i) => {
        if (!el) return
        const rest = restCenters.current[i]
        const c = current.current[i]
        let tx = 0
        let ty = 0

        if (pointer.current.active && rest) {
          const dx = rest.x - pointer.current.x
          const dy = rest.y - pointer.current.y
          const dist = Math.hypot(dx, dy)
          if (dist < REPEL_R) {
            const k = 1 - dist / REPEL_R
            const push = REPEL_PUSH * k * (2 - k)
            const inv = dist > 0.001 ? 1 / dist : 0
            tx = dx * inv * push
            ty = dy * inv * push
          }
        }

        c.x += (tx - c.x) * REPEL_EASE
        c.y += (ty - c.y) * REPEL_EASE
        if (Math.abs(c.x) > 0.05 || Math.abs(c.y) > 0.05) settled = false
        el.style.transform = `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px)`
      })

      if (!dismissedRef.current && (pointer.current.active || !settled)) {
        rafId.current = requestAnimationFrame(tick)
      }
    }

    function startLoop(): void {
      if (rafId.current === null && !dismissedRef.current) rafId.current = requestAnimationFrame(tick)
    }

    function onPointerEnter(e: PointerEvent): void {
      if (e.pointerType !== 'mouse') return
      measureRestCenters()
      pointer.current.x = e.clientX
      pointer.current.y = e.clientY
      pointer.current.active = true
      startLoop()
    }

    function onPointerMove(e: PointerEvent): void {
      if (e.pointerType !== 'mouse') return
      pointer.current.x = e.clientX
      pointer.current.y = e.clientY
      startLoop()
    }

    function onPointerLeave(e: PointerEvent): void {
      if (e.pointerType !== 'mouse') return
      pointer.current.active = false
      startLoop()
    }

    const wrap = wrapRef.current
    wrap?.addEventListener('pointerenter', onPointerEnter)
    wrap?.addEventListener('pointermove', onPointerMove, { passive: true })
    wrap?.addEventListener('pointerleave', onPointerLeave)
    return () => {
      wrap?.removeEventListener('pointerenter', onPointerEnter)
      wrap?.removeEventListener('pointermove', onPointerMove)
      wrap?.removeEventListener('pointerleave', onPointerLeave)
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    }
  }, [])

  /* Zodra de dissolve begint neemt de CSS-transition van .is-dismissed het
     transform over (zie site.css) — de rAF-loop stopt zichzelf al via
     dismissedRef, dit veegt alleen de laatst gezette inline transform weg
     zodat die CSS-regel niet met een achtergebleven translate concurreert. */
  useEffect(() => {
    if (!dismissed) return
    markRefs.current.forEach((el) => {
      if (el) el.style.transform = ''
    })
  }, [dismissed])

  return (
    <div ref={wrapRef} className={`kh-scroll-cue${dismissed ? ' is-dismissed' : ''}`} aria-hidden="true">
      <svg width="150" height="157" viewBox="-4 -8 88 92" className="kh-scroll-cue-icon">
        {DISPERSED_MARKS.map((m, i) => (
          <polygon
            key={i}
            ref={(el) => {
              markRefs.current[i] = el
            }}
            points={m.pts}
            fill="none"
            stroke={m.color}
            strokeWidth="0.6"
            className="kh-scroll-cue-mark"
            style={
              {
                '--o': m.o,
                '--dx': m.dx,
                '--dy': m.dy,
                animationDelay: `${m.d}s`,
                transitionDelay: `${((m.d / 3.4) * 0.55).toFixed(2)}s`,
              } as CSSProperties
            }
          />
        ))}
      </svg>
    </div>
  )
}
