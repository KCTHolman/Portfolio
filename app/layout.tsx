import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import './styles/site.css'
import './styles/aurora.css'
import './styles/fleet.css'

import { AuroraProvider } from '@/components/aurora/aurora-provider'
import { AuroraStage } from '@/components/aurora/aurora-stage'
import { AuroraToast } from '@/components/aurora/aurora-toast'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <a className="kh-skip" href="#inhoud">
          Naar de inhoud
        </a>

        <AuroraProvider>
          <div className="kh-shell">
            <AuroraStage />
            <SiteHeader />
            {children}
            <SiteFooter />
            <AuroraToast />
          </div>
        </AuroraProvider>
      </body>
    </html>
  )
}
