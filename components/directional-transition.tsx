/* Wikkelt de paginainhoud in React's <ViewTransition>, richtinggevoelig:
   kh-forward/kh-back komt van components/link.tsx (via NAV_ORDER in
   lib/nav.ts) en bepaalt of de pagina naar links of rechts wisselt — zie de
   kh-forward/kh-back-recepten in app/styles/site.css. default="none" houdt
   elke andere transitie (Suspense, revalidatie) stil.

   Alleen in paginacomponenten gebruiken, nooit in een layout: een layout
   blijft over navigaties heen bestaan en unmount dus nooit, waardoor
   enter/exit hier nooit zouden afgaan. */

import { ViewTransition } from 'react'
import type { ReactNode } from 'react'

export function DirectionalTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'kh-forward': 'kh-forward', 'kh-back': 'kh-back', default: 'none' }}
      exit={{ 'kh-forward': 'kh-forward', 'kh-back': 'kh-back', default: 'none' }}
      default="none"
    >
      {children}
    </ViewTransition>
  )
}
