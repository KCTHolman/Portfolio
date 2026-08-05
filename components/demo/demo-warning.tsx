'use client'

import { useDemo } from './demo-context'

/* De melding die meerekent. Staat twee keer op de pagina — boven het
   dagoverzicht en in het sheet — met dezelfde tekst en hetzelfde niveau. */

export function DemoWarning({ variant }: { variant?: 'page' }) {
  const { warning, showWarning } = useDemo()

  return (
    <p
      className={variant === 'page' ? 'kh-warn kh-warn--page' : 'kh-warn'}
      data-level={warning.level}
      hidden={!showWarning}
    >
      <span className="kh-warn-icon" aria-hidden="true">
        &#9790;
      </span>
      <span className="kh-warn-text">{warning.text}</span>
    </p>
  )
}
