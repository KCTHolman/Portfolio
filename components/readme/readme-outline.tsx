'use client'

import { useEffect, useState } from 'react'

import { OUTLINE } from '@/lib/readme-outline'

/* De outline-rail loopt mee met waar je bent. De lijst zelf staat in de JSX
   en werkt zonder JS; dit markeert alleen welke regel actief is. */

/** De laatste kop die boven de leeslijn is gepasseerd, niet de eerste die in
 *  beeld staat: bij een lange sectie staat de kop allang buiten beeld terwijl
 *  je er nog middenin leest. */
const LINE = 140

export function ReadmeOutline() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const targets = OUTLINE.map((item) => document.getElementById(item.id))

    const update = () => {
      let index = 0
      targets.forEach((target, i) => {
        if (target && target.getBoundingClientRect().top <= LINE) index = i
      })

      /* Onderaan de pagina kan de laatste kop de lijn nooit meer passeren als
         de sectie korter is dan het scherm; dan hoort hij toch actief te zijn. */
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        index = targets.length - 1
      }

      setCurrent(index)
    }

    // Eén meting per frame in plaats van één per scroll-event.
    let queued = false
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        update()
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <nav className="gh-outline" aria-label="Inhoud van dit bestand">
      {/* De wikkel is wat plakt, niet de nav zelf: de nav is de grid-cel en
          die is net zo hoog als het bestand ernaast. */}
      <div className="gh-outline-inner">
        <p className="gh-outline-label">Inhoud</p>
        <ul>
          {OUTLINE.map((item, i) => (
            <li key={item.id} data-depth={item.depth}>
              <a href={`#${item.id}`} {...(i === current ? { 'data-current': '' } : {})}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
