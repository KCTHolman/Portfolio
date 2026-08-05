import { Fleet } from '@/components/fleet'
import { GitHubIcon, InstagramIcon, LinkedInIcon } from '@/components/social-icons'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Over Koen Holman — software engineer in Tilburg',
  description:
    'Support engineer bij Indicia in Tilburg, met jaren ervaring in full stack development en een sterke nieuwsgierigheid naar AI.',
  path: '/over/',
})

const PANELS = [
  {
    num: '01',
    title: 'Nu',
    body: (
      <>
        Support developer bij <strong>Indicia</strong> in Tilburg. Ik kom in veel verschillende
        systemen &mdash; onderhoud ze, los storingen op en duik net zo makkelijk in code die ik
        gisteren nog niet kende. Die breedte houdt me scherp, en ik ben graag het aanspreekpunt:
        technisch &eacute;n richting de klant.
      </>
    ),
  },
  {
    num: '02',
    title: 'Achtergrond',
    body: (
      <>
        Jaren ervaring in full stack development, breed inzetbaar en altijd lerend. Met een sterke
        nieuwsgierigheid naar AI.
      </>
    ),
  },
  {
    num: '03',
    title: 'De vloot',
    body: (
      <>
        Wat een hobbyproject was, is stilletjes iets serieus geworden: een vloot waarin AI-agents het
        werk in mijn projecten doen &mdash; van idee tot opgeleverde code &mdash; en ik alleen op de
        belangrijke momenten beslis. Wat begon als &eacute;&eacute;n project draait inmiddels los,
        zodat meerdere projecten er tegelijk op meeliften.
      </>
    ),
  },
  {
    num: '04',
    title: 'Tegen drift',
    body: (
      <>
        Bij lange taken verliest een AI wel eens de rode draad, of er sluipt langzaam drift in en hij
        bouwt keurig verder in de verkeerde richting. Dat los je niet op met een beter model, maar
        met kleine stations die elk maar &eacute;&eacute;n ding hoeven te weten, elke stap
        automatisch nagelopen &mdash; en een stop na twee mislukte pogingen.
      </>
    ),
  },
  {
    num: '05',
    title: 'Twee lessen',
    body: (
      <>
        Een plan wordt eerst getoetst: een tweede AI heeft als enige opdracht het af te keuren, en
        pas als het die toets overleeft mag er gebouwd worden. En niet elk karwei vraagt om het
        zwaarste model &mdash; opruimwerk draait op goedkope modellen of simpele scriptjes, het zware
        model is er alleen voor als er echt nagedacht moet worden.
      </>
    ),
  },
]

const LINKS = [
  { href: 'https://www.linkedin.com/in/koen-holman/', label: 'LinkedIn', Icon: LinkedInIcon },
  { href: 'https://www.instagram.com/koenholman/', label: 'Instagram', Icon: InstagramIcon },
  { href: 'https://github.com/KCTHolman', label: 'GitHub', Icon: GitHubIcon },
]

export default function OverPage() {
  return (
    <>
      <Fleet variant="ambient" />
      <main className="kh-main kh-main--over" id="inhoud">
        <section style={{ maxWidth: '720px' }}>
          <p className="kh-eyebrow">Over</p>
          <h1 className="kh-page-title">
            Bouwen, en het <span className="kh-accent">waarom</span> erbij
          </h1>
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
        </section>

        <div className="kh-panel-grid">
          {PANELS.map((panel) => (
            <section key={panel.num} className="kh-panel">
              <p className="kh-panel-num">{panel.num}</p>
              <h2 className="kh-panel-title">{panel.title}</h2>
              <p className="kh-panel-body">{panel.body}</p>
            </section>
          ))}
        </div>
      </main>
    </>
  )
}
