import { Fleet } from '@/components/fleet'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Contact — Koen Holman',
  description:
    'Neem contact op met Koen Holman, software engineer uit Tilburg. Via LinkedIn of GitHub.',
  path: '/contact/',
})

export default function ContactPage() {
  return (
    <>
      <Fleet variant="ambient" />
      <main className="kh-main kh-main--contact" id="inhoud">
        <section style={{ maxWidth: '640px' }}>
          <p className="kh-eyebrow">Contact</p>
          <h1 className="kh-page-title">
            Zeg <span className="kh-accent">hallo</span>
          </h1>
          <p className="kh-contact-lead">
            Altijd in voor een goed gesprek over software, AI en alles ertussenin.
          </p>
          <div className="kh-link-row">
            <a
              className="kh-link"
              href="https://www.linkedin.com/in/koen-holman/"
              target="_blank"
              rel="noopener"
            >
              LinkedIn
            </a>
            <a className="kh-link" href="https://github.com/KCTHolman" target="_blank" rel="noopener">
              GitHub
            </a>
          </div>
        </section>
      </main>
    </>
  )
}
