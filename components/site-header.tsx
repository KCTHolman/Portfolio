'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/* Dezelfde volgorde als de leesrichting van de site — assets/transitions.js
   leidde de richting van de paginawissel er ooit uit af, en
   components/view-transitions.tsx doet dat nog steeds. */
export const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/werk/', label: 'AI-projecten' },
  { href: '/over/', label: 'Over' },
  { href: '/contact/', label: 'Contact' },
] as const

/** /werk/logboek/ en /werk/readme/ liggen onder AI-projecten, dus daar blijft
 *  die nav-ingang de huidige. */
function isCurrent(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="kh-header">
      <div className="kh-header-inner">
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
    </header>
  )
}
