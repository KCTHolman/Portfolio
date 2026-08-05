import type { Metadata } from 'next'

export const SITE_URL = 'https://koenholman.nl'

const OG_IMAGE = {
  url: '/assets/og.png',
  width: 1200,
  height: 630,
  alt: 'Koen Holman — software engineer, full stack en AI.',
}

type PageMetadataInput = {
  title: string
  description: string
  /** Pad met slash erachter, zoals de site het serveert: '/werk/'. */
  path: string
}

/**
 * Bouwt de volledige metadata voor één pagina.
 *
 * Next voegt metadata van layout en pagina samen per veld op het hoogste
 * niveau — definieert een pagina `openGraph`, dan vervángt dat het object van
 * de layout in z'n geheel, inclusief siteName, locale en de afbeelding.
 * Vandaar dat hier elke keer het hele blok gebouwd wordt in plaats van erop
 * te vertrouwen dat de layout de rest aanvult.
 */
export function pageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'nl_NL',
      siteName: 'Koen Holman',
      url: path,
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image' },
  }
}
