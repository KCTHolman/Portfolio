import type { ReactNode } from 'react'

/* Eén halte in het scrollverhaal: alleen de kernzin staat in de "verhalende"
   stand. Alles daaronder zit in twee tiers, allebei gestuurd door data-depth
   op de gezamenlijke root in werk-journey.tsx (zie .dsv-depth-extra in
   site.css): "techniek" voor tech/fail/children (zoals voorheen), en het
   nieuwe "architectuur" voor deep — uitsluitend zichtbaar op het diepste
   niveau, en additief: niets verdwijnt als je verder schuift. */

type JourneySectionProps = {
  id: string
  eyebrow: string
  title: ReactNode
  lead: ReactNode
  tech?: ReactNode
  fail?: ReactNode
  children?: ReactNode
  deep?: ReactNode
}

export function JourneySection({
  id,
  eyebrow,
  title,
  lead,
  tech,
  fail,
  children,
  deep,
}: JourneySectionProps) {
  const hasDepth = Boolean(tech || fail || children)
  const hasDeep = Boolean(deep)

  return (
    <section id={id} className="kh-journey-section">
      <p className="dsv-eyebrow">
        <span className="dsv-eyebrow-dot" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="dsv-title">{title}</h2>
      <p className="dsv-lead">{lead}</p>

      {hasDepth ? (
        <div className="dsv-depth-extra" data-tier="techniek">
          {tech ? (
            <p className="dsv-entry-tech">
              <span className="dsv-tech-label">achtergrond</span>
              {tech}
            </p>
          ) : null}
          {fail ? (
            <p className="dsv-entry-fail">
              <span className="dsv-fail-label">als het misgaat</span>
              {fail}
            </p>
          ) : null}
          {children}
        </div>
      ) : null}

      {hasDeep ? (
        <div className="dsv-depth-extra" data-tier="architectuur">
          {deep}
        </div>
      ) : null}
    </section>
  )
}
