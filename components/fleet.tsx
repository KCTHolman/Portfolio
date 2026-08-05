'use client'

/* ==========================================================================
   De vloot — het beeldmerk van deze site.

   Twee standen:
     hero     de volle vloot, schermvullend achter de homepage
     ambient  een handvol verre boten achter de inhoud van een subpagina

   De kleuren komen uit dezelfde --t1..--t3 die de aurora op <html> schrijft,
   dus de vloot verkleurt mee met de wash erachter in plaats van ernaast te
   staan.

   Zelfde afspraken als de aurora: bij reduced motion en op een telefoon staat
   er één stilstaand, volledig gevormd beeld — daar kost een canvas dat elke
   frame honderden paden trekt meer dan het oplevert. Die twee zitten in de
   dependencies van het effect, dus een omslag bouwt de scène vanzelf opnieuw
   op.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react'

import {
  AMBIENT_BOATS,
  COLORS,
  FALLBACK_ACCENTS,
  FIXED_COLORS,
  HERO_BOATS,
  LEAD_W,
  RATIO,
  SETTLE,
  TIERS,
  buildAmbientDust,
  buildBoat,
  ease,
  parseHsl,
  rng,
  type BoatSpec,
  type Particle,
} from '@/lib/fleet-geometry'
import { useMediaQuery, useNarrowScreen, usePrefersReducedMotion } from '@/lib/use-media-query'

export type FleetVariant = 'hero' | 'ambient'

/** Een boot op het scherm: de spec plus alles wat per frame of per maat
 *  verandert. */
type Boat = BoatSpec & {
  bobA: number
  bobF: number
  bobP: number
  rockA: number
  rockF: number
  rockP: number
  /** Overstag in plaats van doorvaren — zie de opmerking bij build(). */
  swayA: number
  swayF: number
  swayP: number
  pw: number
  ph: number
  px: number
  py: number
  dx: number
  dy: number
  rot: number
  sin: number
  cos: number
}

export function Fleet({ variant }: { variant: FleetVariant }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sailing, setSailing] = useState(false)

  const reduceMotion = usePrefersReducedMotion()
  const narrowScreen = useNarrowScreen()
  const coarsePointer = useMediaQuery('(pointer: coarse)')

  useEffect(() => {
    const mount = mountRef.current
    const canvas = canvasRef.current
    if (!mount || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /* Stilstaand beeld in plaats van een lopende animatie: bij reduced motion
       omdat het gevraagd is, op een telefoon omdat het daar meer kost dan het
       oplevert. */
    const frozen = reduceMotion || narrowScreen
    const specs = variant === 'hero' ? HERO_BOATS : AMBIENT_BOATS
    const formMs = variant === 'hero' ? 2100 : 1500

    let w = 0
    let h = 0
    let boats: Boat[] = []
    let parts: Particle[] = []
    let frame: number | null = null
    let lastFrame = 0
    let lastDraw = 0
    let lastPalette = 0
    /* Eén klok voor alles. requestAnimationFrame levert een tijdstempel op de
       performance-klok aan; wie daar een Date.now() naast legt, rekent met een
       verschil van een halve eeuw en krijgt nooit een animatie die afloopt. */
    let t0 = performance.now()
    let repelR = 0
    let repelPush = 0

    const settle = new Array<number>(SETTLE.length)
    const groups: Particle[][] = []
    const groupPhase: number[] = []
    const tierAlpha: number[] = []

    /* x/y: de uitgevlakte stand voor de parallax, als fractie van -1 tot 1.
       px/py: waar de muis nu écht staat, in beeldpunten — het canvas ligt vast
       aan het beeldscherm, dus clientX/clientY zijn hier meteen goed. */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, on: false }

    const palette: [number, number, number][] = [
      [...FALLBACK_ACCENTS[0]],
      [...FALLBACK_ACCENTS[1]],
      [...FALLBACK_ACCENTS[2]],
      [...FIXED_COLORS[0]],
      [...FIXED_COLORS[1]],
      [...FIXED_COLORS[2]],
    ]
    const paletteStr = new Array<string>(COLORS)

    for (let t = 0; t < TIERS; t++) {
      // Niet lineair: de meeste korrels horen in de stille helft thuis, en een
      // handvol mag echt oplichten.
      tierAlpha.push(0.24 + Math.pow(t / (TIERS - 1), 1.35) * 0.72)
    }
    for (let g = 0; g < COLORS * TIERS; g++) {
      groups.push([])
      groupPhase.push((g * 2.399) % (Math.PI * 2))
    }

    /* De aurora zet --t1..--t3 als inline style op <html>, dus dit leest de
       eigenschap rechtstreeks van het element af — getComputedStyle zou hier
       per keer een style-recalc afdwingen voor precies dezelfde drie waarden. */
    function readAccents(): boolean {
      const root = document.documentElement
      let changed = false
      for (let i = 0; i < 3; i++) {
        const hsl = parseHsl(root.style.getPropertyValue(`--t${i + 1}`))
        if (!hsl) continue
        if (palette[i][0] !== hsl[0] || palette[i][1] !== hsl[1] || palette[i][2] !== hsl[2]) {
          palette[i] = hsl
          changed = true
        }
      }
      return changed
    }

    function syncPalette(): void {
      for (let i = 0; i < COLORS; i++) {
        const c = palette[i]
        paletteStr[i] = `hsl(${Math.round(c[0] * 10) / 10},${c[1]}%,${c[2]}%)`
      }
    }

    function measure(): void {
      const rect = mount!.getBoundingClientRect()
      w = Math.max(1, Math.round(rect.width))
      h = Math.max(1, Math.round(rect.height))
    }

    function build(): void {
      let quality = frozen ? 0.5 : 1
      if (variant === 'ambient') quality *= 0.7
      measure()

      parts = []
      boats = []

      specs.forEach((spec, b) => {
        boats.push({
          ...spec,
          bobA: 0,
          bobF: 0.22 + (b % 4) * 0.07,
          bobP: b * 1.7,
          rockA: 0.014 + (b % 3) * 0.008,
          rockF: 0.17 + (b % 5) * 0.05,
          rockP: b * 2.3,
          /* Overstag in plaats van doorvaren. Eerder voer een boot het beeld
             uit en kwam er aan de andere kant weer in; dat werkte zolang de
             randen wegvaagden, maar nu het canvas doorloopt tot de schermrand
             zou je hem zien verspringen. Een hele trage slinger houdt de
             beweging en laat de vloot bovendien waar hij hoort. */
          swayA: 0,
          swayF: 0.045 + (b % 5) * 0.011,
          swayP: b * 1.9,
          pw: 0,
          ph: 0,
          px: 0,
          py: 0,
          dx: 0,
          dy: 0,
          rot: 0,
          sin: 0,
          cos: 1,
        })

        for (const made of buildBoat(spec, b, quality)) {
          made.boat = b
          parts.push(made)
        }
      })

      /* Het stof telt per oppervlak, niet per canvas: nu de laag het hele
         scherm beslaat zou een vast aantal op een breed scherm uitdunnen tot
         niets en op een telefoon een korrelig vlak worden. Wel een dak erop,
         want een 4K-scherm hoeft er geen tienduizend te tekenen. */
      const dust = buildAmbientDust(
        Math.min(520, Math.round(((w * h) / (variant === 'hero' ? 4200 : 7000)) * quality)),
        rng(0x21f3),
      )
      parts.push(...dust)

      for (const group of groups) group.length = 0
      for (const p of parts) groups[p.col * TIERS + p.tier].push(p)
    }

    /** Genormaliseerde vorm naar pixels. Draait bij elke maatverandering
     *  opnieuw; de vorm zelf blijft staan, alleen de schaal verschuift. */
    function layout(): void {
      measure()
      const dpr = Math.min(2, window.devicePixelRatio || 1)

      canvas!.width = Math.round(w * dpr)
      canvas!.height = Math.round(h * dpr)
      canvas!.style.width = `${w}px`
      canvas!.style.height = `${h}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.lineWidth = 1
      ctx!.lineJoin = 'round'

      /* De voorste boot moet in beide richtingen passen mét lucht eromheen —
         op de breedte alleen schalen levert op een laag canvas een boot op
         waarvan de romp onder de rand verdwijnt. Het canvas is nu het hele
         scherm terwijl de boot maar de rechterhelft gebruikt, dus de breedte
         telt voor ongeveer de helft mee. Op een telefoon staat de vloot achter
         de tekst en mag hij het scherm wél vullen. */
      const share = narrowScreen ? 0.78 : 0.44
      const lead = Math.min(w * share, (h * 0.62) / RATIO)

      for (const boat of boats) {
        boat.pw = lead * (boat.w / LEAD_W)
        boat.ph = boat.pw * RATIO
        boat.px = w * boat.cx
        boat.py = h * boat.cy
        boat.bobA = boat.ph * 0.022
        // De voorste boot ligt bijna stil, de verste slingert het meest —
        // hetzelfde principe als bij de helderheid en de korrelgrootte.
        boat.swayA = frozen ? 0 : w * (0.038 - boat.depth * 0.031)
      }

      /* Het bereik van de muis groeit mee met het scherm, maar blijft binnen
         grenzen: te klein en er gebeurt niets zichtbaars, te groot en de hele
         vloot deint mee met elke beweging in plaats van alleen wat je raakt. */
      repelR = Math.max(110, Math.min(230, Math.min(w, h) * 0.19))
      repelPush = repelR * 0.44

      parts.forEach((p, i) => {
        if (p.boat < 0) {
          p.bx = p.ux * w
          p.by = p.uy * h
        } else {
          const owner = boats[p.boat]
          p.bx = (p.ux - 0.5) * owner.pw
          /* 0.48, niet 0.5: de vorm loopt van masttop (0.03) tot kielwater
             (0.95), dus het optische midden ligt net boven het midden van het
             genormaliseerde vak. */
          p.by = (p.uy - 0.48) * owner.ph
        }
        // Startpositie van de opbouw: vanaf buiten het beeld naar binnen,
        // zodat de vloot zich verzamelt in plaats van te verschijnen.
        const ax = p.boat < 0 ? p.bx : boats[p.boat].px + p.bx
        const ay = p.boat < 0 ? p.by : boats[p.boat].py + p.by
        const vx = ax - w * 0.5
        const vy = ay - h * 0.52
        const k = 1.5 + ((i * 37) % 100) / 100
        p.sx = w * 0.5 + vx * k + ((i * 53) % 60) - 30
        p.sy = h * 0.52 + vy * k + ((i * 29) % 60) - 30
      })
    }

    function draw(now: number): void {
      const elapsed = (now - t0) / 1000
      const form = frozen ? 1 : Math.min(1, (now - t0) / formMs)
      const forming = form < 1
      const time = frozen ? 0 : elapsed
      const repel = pointer.on && !frozen

      /* Hoe hard de veren deze frame aantrekken, gerekend in tijd en niet in
         frames. Anders sluit hetzelfde gat op een trage machine merkbaar
         langzamer dan op een snelle. Het dak van 100 ms vangt de sprong op die
         volgt op een tabblad dat even weg is geweest. */
      const dt = lastDraw ? Math.min(0.1, (now - lastDraw) / 1000) : 0.03
      lastDraw = now
      const pullStir = 1 - Math.exp(-dt / 0.09)
      for (let s = 0; s < SETTLE.length; s++) {
        settle[s] = 1 - Math.exp(-dt / SETTLE[s])
      }

      pointer.x += (pointer.tx - pointer.x) * 0.06
      pointer.y += (pointer.ty - pointer.y) * 0.06

      for (const boat of boats) {
        boat.dy = Math.sin(time * boat.bobF + boat.bobP) * boat.bobA + pointer.y * boat.par * 8
        boat.rot = boat.heel + Math.sin(time * boat.rockF + boat.rockP) * boat.rockA
        boat.sin = Math.sin(boat.rot)
        boat.cos = Math.cos(boat.rot)

        // Elke frame opnieuw uit de tijd gerekend, niet opgeteld: opgeteld
        // loopt de boot weg zodra er een frame overslaat.
        boat.dx = Math.sin(time * boat.swayF + boat.swayP) * boat.swayA + pointer.x * boat.par * 12
      }

      ctx!.clearRect(0, 0, w, h)

      for (let g = 0; g < groups.length; g++) {
        const list = groups[g]
        if (!list.length) continue

        /* Eén puls per groep in plaats van per korrel: de groepen liggen
           kriskras door de vloot, dus je ziet een veld dat ademt en niet een
           aantal vlakken dat samen aan- en uitgaat. */
        const pulse = frozen ? 1 : 0.7 + 0.3 * Math.sin(time * 0.7 + groupPhase[g])
        ctx!.globalAlpha = tierAlpha[g % TIERS] * pulse
        ctx!.strokeStyle = paletteStr[(g / TIERS) | 0]
        ctx!.beginPath()

        for (const p of list) {
          let x: number
          let y: number

          if (p.boat < 0) {
            x = p.bx + (p.vx ? p.vx * time : 0)
            y = p.by
            x = ((x % w) + w) % w
          } else {
            const o = boats[p.boat]
            x = o.px + o.dx + p.bx * o.cos - p.by * o.sin
            y = o.py + o.dy + p.bx * o.sin + p.by * o.cos
          }

          if (!frozen) {
            x += Math.sin(time * p.jf + p.jp) * p.ja
            y += Math.cos(time * p.jf * 0.8 + p.jp) * p.ja * 0.7
          }

          if (forming) {
            const e = ease(Math.min(1, Math.max(0, (form - p.lag) / (1 - 0.45))))
            x = p.sx + (x - p.sx) * e
            y = p.sy + (y - p.sy) * e
          }

          /* De muis roert door het veld. Drie delen, en de verhouding ertussen
             is het hele punt:
               draaiing  loodrecht op de cursor, voor alle korrels dezelfde
                         kant op — dat leest als roeren.
               eigenzin  elke korrel heeft z'n eigen richting, dus buren gaan
                         uit elkaar in plaats van samen opzij. Dit is wat het
                         wanorde maakt en geen verschuiving.
               afstoting klein gehouden. Een flinke radiale duw veegt de boel
                         uit een cirkel weg en laat een gat achter; daar is het
                         niet om te doen. */
          let tox = 0
          let toy = 0
          let hit = false
          if (repel) {
            const rdx = x - pointer.px
            const rdy = y - pointer.py
            const d2 = rdx * rdx + rdy * rdy
            if (d2 < repelR * repelR) {
              hit = true
              const d = Math.sqrt(d2) || 0.001
              const k = 1 - d / repelR
              /* k * (2 - k), niet k in het kwadraat: dat laatste stopt bijna
                 alle beweging in de paar korrels pal onder de cursor, en dan
                 gebeurt er zichtbaar niets. */
              const f = repelPush * k * (2 - k) * p.grip
              const ux = rdx / d
              const uy = rdy / d
              /* De eigen richting draait langzaam mee zolang de cursor er
                 staat, zodat het blijft borrelen in plaats van te bevriezen in
                 één verstoorde stand. */
              const a = p.chaos + time * 0.5
              tox = (ux * 0.18 - uy * 0.6 + Math.cos(a) * 0.8) * f
              toy = (uy * 0.18 + ux * 0.6 + Math.sin(a) * 0.8) * f
            }
          }
          /* In de war raken gaat snel en voor iedereen even snel; terugvinden
             gaat traag en voor elke korrel anders. Dat verschil is precies waar
             je naar kijkt. */
          const pull = hit ? pullStir : settle[p.traag]
          p.ox += (tox - p.ox) * pull
          p.oy += (toy - p.oy) * pull
          x += p.ox
          y += p.oy

          const r = p.r
          const a = p.spin + (frozen ? 0 : time * 0.08)
          ctx!.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
          ctx!.lineTo(x + Math.cos(a + 2.0944) * r, y + Math.sin(a + 2.0944) * r)
          ctx!.lineTo(x + Math.cos(a + 4.1888) * r, y + Math.sin(a + 4.1888) * r)
          ctx!.closePath()
        }

        ctx!.stroke()
      }

      ctx!.globalAlpha = 1
    }

    function loop(now: number): void {
      /* Tijdens de opbouw op volle snelheid, daarna rond de 30 beelden per
         seconde: het is een deinende achtergrond, geen animatie waar iemand
         naar zit te kijken. */
      const forming = now - t0 < formMs
      if (forming || now - lastFrame >= 30) {
        lastFrame = now
        if (now - lastPalette >= 220) {
          lastPalette = now
          if (readAccents()) syncPalette()
        }
        draw(now)
      }
      frame = requestAnimationFrame(loop)
    }

    function shouldAnimate(): boolean {
      return !frozen && document.visibilityState !== 'hidden'
    }

    function sync(): void {
      if (frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      if (shouldAnimate()) {
        frame = requestAnimationFrame(loop)
      } else {
        syncPalette()
        draw(t0 + formMs + 1)
      }
    }

    /* ---------- reageren op de omgeving ---------------------------------- */

    let resizeTimer: number | undefined
    function onResize(): void {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        /* Opnieuw opbouwen én uitmeten: het aantal stofkorrels hangt aan het
           oppervlak, dus een ander formaat vraagt een andere vulling. De zaden
           liggen vast, dus de boten zelf blijven exact dezelfde. */
        build()
        layout()
        if (!shouldAnimate()) draw(t0 + formMs + 1)
      }, 160)
    }

    const observer = new ResizeObserver(onResize)
    observer.observe(mount)

    function onPointerMove(e: PointerEvent): void {
      if (e.pointerType === 'touch') return
      pointer.px = e.clientX
      pointer.py = e.clientY
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2
      pointer.on = true
    }

    /* Muis het venster uit: het gat trekt weer dicht. Zonder dit blijft de
       laatste stand staan tot de muis terugkomt. */
    function releasePointer(): void {
      pointer.on = false
    }

    /* Alleen waar er een echte aanwijzer is. Op een aanraakscherm zou de
       laatste tik een gat in de vloot achterlaten dat er blijft staan. */
    if (!coarsePointer) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      document.addEventListener('pointerleave', releasePointer)
      document.addEventListener('pointercancel', releasePointer)
      window.addEventListener('blur', releasePointer)
    }

    document.addEventListener('visibilitychange', sync)

    readAccents()
    syncPalette()
    build()
    layout()
    t0 = performance.now()
    sync()
    setSailing(true)

    return () => {
      observer.disconnect()
      window.clearTimeout(resizeTimer)
      document.removeEventListener('visibilitychange', sync)
      if (!coarsePointer) {
        window.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerleave', releasePointer)
        document.removeEventListener('pointercancel', releasePointer)
        window.removeEventListener('blur', releasePointer)
      }
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [coarsePointer, narrowScreen, reduceMotion, variant])

  const className = [
    variant === 'hero' ? 'kh-home-visual' : 'kh-ambient',
    sailing ? 'is-varend' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={mountRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="kh-fleet-canvas" aria-hidden="true" />
    </div>
  )
}
