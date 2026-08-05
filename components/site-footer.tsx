'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import { AuroraSwatches } from '@/components/aurora/aurora-swatches'
import { Link } from '@/components/link'
import { NAV_ITEMS } from '@/lib/nav'

/** /werk/readme/ ligt onder AI-projecten, dus daar blijft die nav-ingang de
 *  huidige. */
function isCurrent(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export function SiteFooter() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  /* Dicht bij een paginawissel: anders blijft de nav open staan boven de
     nieuwe pagina. */
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <footer className="kh-footer">
      <div className="kh-footer-inner">
        {/* Open: de navigatie neemt tijdelijk de plek van merknaam + presets
            in. Dicht: gewoon de merknaam, met de presets rechts ernaast. */}
        <div className="kh-footer-menu">
          <button
            type="button"
            className="kh-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="kh-footer-nav"
            aria-label={menuOpen ? 'Menu sluiten' : 'Menu openen'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="kh-menu-toggle-bars" aria-hidden="true" />
          </button>

          {menuOpen ? (
            <nav className="kh-footer-nav" id="kh-footer-nav" aria-label="Hoofdmenu">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  className="khnav"
                  href={item.href}
                  aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : (
            <Link className="kh-brand" href="/">
              <span className="kh-dot" />
              Koen Holman
            </Link>
          )}
        </div>

        {/* Presets rechts: elke swatch rijdt op de live accentvariabelen van
            zijn eigen preset, zodat de rij mee blijft zwaaien. Verdwijnt
            zolang het menu open staat, want die plek is dan voor de nav. */}
        {!menuOpen && <AuroraSwatches />}
      </div>
    </footer>
  )
}
