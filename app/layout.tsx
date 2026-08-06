import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next'

import './styles/site.css'
import './styles/aurora.css'
import './styles/fleet.css'

import { AuroraProvider } from '@/components/aurora/aurora-provider'
import { AuroraStage } from '@/components/aurora/aurora-stage'
import { SiteFooter } from '@/components/site-footer'
import { ViewTransitions } from '@/components/view-transitions'
import { SITE_URL } from '@/lib/metadata'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: '/assets/favicon.ico', sizes: 'any' },
      { url: '/assets/favicon-32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/assets/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#010309',
}

/* De drie subsets die de bovenste helft van elke pagina nodig heeft — de
 * "latin-ext"-varianten (accenten buiten Latin-1) laten we aan de gewone
 * @font-face-ontdekking over, die is nooit boven de vouw nodig. Zonder deze
 * hint ontdekt de browser deze bestanden pas ná het parsen van fonts.css; de
 * hero-titel (en de cursieve "Holman" erin, een apart gewicht) staat dan
 * langer in de fallback voordat hij naar het echte font wisselt. */
const CRITICAL_FONTS = [
  '/assets/fonts/space-grotesk-latin.woff2',
  '/assets/fonts/cormorant-garamond-latin.woff2',
  '/assets/fonts/cormorant-garamond-italic-latin.woff2',
]

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body>
        {CRITICAL_FONTS.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}

        <a className="kh-skip" href="#inhoud">
          Naar de inhoud
        </a>

        <ViewTransitions>
          <AuroraProvider>
            <div className="kh-shell">
              <AuroraStage />
              {children}
              <SiteFooter />
            </div>
          </AuroraProvider>
        </ViewTransitions>

        <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
        <SpeedInsights />
      </body>
    </html>
  )
}
