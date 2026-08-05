import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import Script from 'next/script'
import type { ReactNode } from 'react'

import './styles/site.css'
import './styles/aurora.css'
import './styles/fleet.css'

import { AuroraProvider } from '@/components/aurora/aurora-provider'
import { AuroraStage } from '@/components/aurora/aurora-stage'
import { AuroraToast } from '@/components/aurora/aurora-toast'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  /* Dwingt dynamische rendering af. Dat is geen bijvangst maar de hele reden:
     Next zet de nonce uit middleware.ts pas op z'n inline scripts als de HTML
     per verzoek gemaakt wordt. Statisch geprerenderde HTML kan geen nonce per
     verzoek dragen, en dan blokkeert je eigen CSP je eigen hydration. */
  await headers()

  return (
    <html lang="nl">
      <body>
        <a className="kh-skip" href="#inhoud">
          Naar de inhoud
        </a>

        <ViewTransitions>
          <AuroraProvider>
            <div className="kh-shell">
              <AuroraStage />
              <SiteHeader />
              {children}
              <SiteFooter />
              <AuroraToast />
            </div>
          </AuroraProvider>
        </ViewTransitions>

        <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
