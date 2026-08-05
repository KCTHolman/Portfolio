import type { ReactNode } from 'react'

/* Dezelfde drie links onder elke weergave van de showcase; alleen de
   onderschrift-regel verschilt per ingang. */

const LINKS = [
  { href: 'https://github.com/KCTHolman/deSchouwVloot', label: 'Bekijk de repo' },
  {
    href: 'https://github.com/KCTHolman/deSchouwVloot/blob/main/docs/architectuur.md',
    label: 'Architectuur & ontwerpkeuzes',
  },
  { href: 'https://www.linkedin.com/in/koen-holman/', label: 'Praat met me erover' },
]

export function ShowcaseFoot({ note }: { note: ReactNode }) {
  return (
    <footer className="dsv-foot">
      <div className="dsv-foot-links">
        {LINKS.map((link) => (
          <a key={link.href} className="kh-link" href={link.href} target="_blank" rel="noopener">
            {link.label}
          </a>
        ))}
      </div>
      <div className="dsv-foot-note">{note}</div>
    </footer>
  )
}
