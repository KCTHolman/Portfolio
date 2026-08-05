import type { ReactNode } from 'react'

/* Eén halte in het scrollverhaal: alleen de kernzin staat in de "verhalende"
   stand. Alles daaronder — tech, fail, én losse children zoals een
   checks-grid of een RAG/MCP-alinea — zit in één gezamenlijke wikkel die de
   diepgang-schakelaar in werk-journey.tsx in één keer in- en uitschakelt
   (data-depth op de gezamenlijke root, zie .dsv-depth-extra in site.css). */

type JourneySectionProps = {
  id: string
  eyebrow: string
  title: ReactNode
  lead: ReactNode
  tech?: ReactNode
  fail?: ReactNode
  children?: ReactNode
}

export function JourneySection({ id, eyebrow, title, lead, tech, fail, children }: JourneySectionProps) {
  const hasDepth = Boolean(tech || fail || children)

  return (
    <section id={id} className="kh-journey-section">
      <p className="dsv-eyebrow">
        <span className="dsv-eyebrow-dot" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="dsv-title">{title}</h2>
      <p className="dsv-lead">{lead}</p>

      {hasDepth ? (
        <div className="dsv-depth-extra">
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
    </section>
  )
}
