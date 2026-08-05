/** De hoofdnavigatie, in leesvolgorde.
 *
 *  Diezelfde volgorde bepaalt de richting van een paginawissel — zie
 *  components/view-transitions.tsx. */
export const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/werk/', label: 'AI-projecten' },
  { href: '/over/', label: 'Over' },
  { href: '/contact/', label: 'Contact' },
] as const
