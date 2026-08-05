'use client'

/* next/link, maar de navigatie loopt via de view transition zodat de pagina
   in de goede richting wegschuift. Verder identiek: prefetch, hover-gedrag en
   toetsenbord blijven van Link zelf. */

import NextLink from 'next/link'
import type { ComponentProps, MouseEvent } from 'react'

import { useViewTransitionNavigate } from './view-transitions'

type LinkProps = ComponentProps<typeof NextLink>

export function Link({ href, onClick, ...rest }: LinkProps) {
  const navigate = useViewTransitionNavigate()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    // Een modifier of middenklik hoort een nieuw tabblad te openen, niet te navigeren.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    if (!navigate || typeof href !== 'string') return

    event.preventDefault()
    navigate(href)
  }

  return <NextLink href={href} onClick={handleClick} {...rest} />
}
