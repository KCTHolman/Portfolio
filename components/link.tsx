'use client'

/* next/link, maar met een richting: een klik naar een andere hoofdpagina
   krijgt kh-forward/kh-back mee als transition type, zodat de pagina in de
   goede richting wisselt (zie components/directional-transition.tsx en
   lib/nav.ts). next/link regelt zelf al prefetch, hover-gedrag, toetsenbord
   en de modifier/middenklik-uitzondering — die hoeft hier niet over. */

import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'

import { directionBetween } from '@/lib/nav'

type LinkProps = ComponentProps<typeof NextLink>

export function Link({ href, transitionTypes, ...rest }: LinkProps) {
  const pathname = usePathname()
  const direction = typeof href === 'string' ? directionBetween(pathname, href) : null

  return <NextLink href={href} transitionTypes={direction ? [direction] : transitionTypes} {...rest} />
}
