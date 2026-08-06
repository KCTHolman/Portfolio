/* ==========================================================================
   /koen-holman/ — Over en Contact samen.

   Geen twee losse pagina's meer met overlappende linkrijen, maar één: de
   knoppenrij dekt meteen "contact" af. De vijf Over-panelen staan gewoon
   onder elkaar, in een doorlopende, normaal scrollende pagina — geen tabs,
   geen vastgezet deel.

   Rechts vaart de nieuwe showcase-vloot: geen scroll of hover stuurt 'm,
   hij wisselt op zijn eigen klok (zie useFleetScene) tussen vloot, een
   lading raketjes en een tandwiel.
   ========================================================================== */

import { Fleet } from '@/components/fleet-lazy'
import { ScrollCue } from '@/components/scroll-cue'
import { GitHubIcon, InstagramIcon, LinkedInIcon } from '@/components/social-icons'

import { PANELS } from './panel-data'

const LINKS = [
  { href: 'https://www.linkedin.com/in/koen-holman/', label: 'LinkedIn', Icon: LinkedInIcon },
  { href: 'https://www.instagram.com/koenholman/', label: 'Instagram', Icon: InstagramIcon },
  { href: 'https://github.com/KCTHolman', label: 'GitHub', Icon: GitHubIcon },
]

export function KoenHolmanPage() {
  return (
    <>
      <Fleet variant="showcase" />

      <main className="kh-main kh-main--koen-holman" id="inhoud">
        <section style={{ maxWidth: '600px' }}>
          <div className="kh-koen-hero">
            <p className="kh-eyebrow">Over &amp; contact</p>
            <h1 className="kh-page-title">
              Bouwen, en het <span className="kh-accent">waarom</span> erbij
            </h1>
            <p className="kh-contact-lead">
              Altijd in voor een goed gesprek over software, AI en alles ertussenin.
            </p>

            <div className="kh-cta-row">
              {LINKS.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  className="khcta khcta--ghost"
                  href={href}
                  target="_blank"
                  rel="noopener"
                  aria-label={label}
                >
                  <Icon />
                  {label}
                </a>
              ))}
              {/* Indicia-logo volgt zodra Koen het aanlevert; tot die tijd een
                  monogram in dezelfde knop-stijl. */}
              <a
                className="khcta khcta--ghost"
                href="https://indicia.nl/"
                target="_blank"
                rel="noopener"
                aria-label="Indicia"
              >
                <span className="kh-indicia-mark" aria-hidden="true">
                  I
                </span>
                Indicia
              </a>
            </div>

            <ScrollCue />
          </div>

          <div className="kh-koen-panels">
            {PANELS.map((p) => (
              <section key={p.num} className="kh-koen-panel">
                <p className="kh-panel-num">{p.num}</p>
                <h2 className="kh-panel-title">{p.title}</h2>
                <p className="kh-panel-body">{p.body}</p>
              </section>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
