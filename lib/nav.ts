/** De hoofdnavigatie, in leesvolgorde.
 *
 *  Diezelfde volgorde bepaalt de richting van een paginawissel — zie
 *  directionBetween() hieronder en components/link.tsx. */
export const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/werk/', label: 'AI-projecten' },
  { href: '/koen-holman/', label: 'Over & contact' },
] as const

const NAV_ORDER = NAV_ITEMS.map((item) => normalize(item.href))

export type NavDirection = 'kh-forward' | 'kh-back'

function normalize(path: string): string {
  const clean = path.replace(/index\.html$/i, '')
  if (clean !== '/' && clean.endsWith('/')) return clean.slice(0, -1) || '/'
  return clean
}

/** Alleen een richting tussen twee van de drie hoofdpagina's — voor elke
 *  andere bestemming (readme, 404, ...) is er geen zinvolle "voorwaarts" of
 *  "terug", dus dan komt er null uit en blijft de wissel ongeanimeerd. */
export function directionBetween(from: string, to: string): NavDirection | null {
  const fromIndex = NAV_ORDER.indexOf(normalize(from))
  const toIndex = NAV_ORDER.indexOf(normalize(to))
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return null
  return toIndex > fromIndex ? 'kh-forward' : 'kh-back'
}
