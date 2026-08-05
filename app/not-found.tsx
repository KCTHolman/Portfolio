import Link from 'next/link'

import { Fleet } from '@/components/fleet'

/* De losse 404 had z'n eigen inline stijlen omdat hij buiten de shell stond.
   Onder de App Router valt hij binnen de root layout, dus hier draait hij op
   de echte klassen van de site — inclusief de .kh-main--error-modifier die
   site.css al klaar had liggen. */

export default function NotFound() {
  return (
    <>
      <Fleet variant="ambient" />
      <main className="kh-main kh-main--error" id="inhoud">
        <section style={{ maxWidth: '640px' }}>
          <p className="kh-eyebrow">Fout 404</p>
          <h1 className="kh-page-title">
            Deze pagina is er <span className="kh-accent">niet</span>
          </h1>
          <p className="kh-contact-lead">
            De link klopt niet meer, of hij heeft nooit bestaan. Ga terug naar de homepage &mdash;
            daar begint alles.
          </p>
          <div className="kh-cta-row">
            <Link className="khcta khcta--primary" href="/">
              Naar de homepage &#8594;
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
