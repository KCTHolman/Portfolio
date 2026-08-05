/** De hoofdnavigatie, in leesvolgorde.
 *
 *  Diezelfde volgorde bepaalt de richting van een paginawissel — zie
 *  components/view-transitions.tsx. */
export const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/werk/', label: 'AI-projecten' },
  { href: '/koen-holman/', label: 'Over & contact' },
] as const
