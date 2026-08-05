'use client'

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

  return (
    <footer className="kh-footer">
      <div className="kh-footer-inner">
        <div className="kh-footer-menu">
          <Link className="kh-brand" href="/">
            <span className="kh-dot" />
            Koen Holman
          </Link>
          <nav className="kh-nav" aria-label="Hoofdmenu">
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
        </div>
        {/* Presets rechts: elke swatch rijdt op de live accentvariabelen van
            zijn eigen preset, zodat de rij mee blijft zwaaien. Op een smal
            scherm wordt het menu links z'n eigen veegbare rij en komen de
            swatches eronder. */}
        <AuroraSwatches />
      </div>
    </footer>
  )
}
