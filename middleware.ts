import { NextResponse, type NextRequest } from 'next/server'

/* ==========================================================================
   Content-Security-Policy.

   De policy stond in vercel.json en had `script-src 'self'` — geen enkel
   inline script. Dat kan niet blijven staan: Next zet z'n eigen bootstrap- en
   hydration-scripts inline in de HTML, en die zou je eigen header dus
   blokkeren.

   Er zijn precies drie uitwegen en ze kosten alle drie iets:

     nonce       per verzoek een ander token. De policy blijft even streng als
                 hij was, maar de HTML verschilt per verzoek en kan dus niet
                 meer als statisch bestand van de CDN komen.
     hashes      onwerkbaar: de hashes veranderen bij elke build.
     unsafe-inline  houdt de pagina's statisch, maar staat élk inline script
                 toe — precies wat deze header tegenhield.

   Hier staat de nonce-variant, omdat een strengere header stilletjes zwakker
   maken erger is dan een pagina die per verzoek gerenderd wordt. Wil je de
   statische levering terug, haal dan deze middleware weg en zet de policy
   terug in vercel.json met 'unsafe-inline' erbij op script-src.

   Next leest de nonce zelf uit de Content-Security-Policy op het binnenkomende
   verzoek en zet hem op z'n eigen scripts; daar is verder niets voor nodig.
   ========================================================================== */

function makeNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

export function middleware(request: NextRequest) {
  const nonce = makeNonce()

  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://va.vercel-scripts.com`,
    // De site zet CSS-variabelen als inline style — de aurora schrijft er acht
    // per frame. Dat was in de oude policy ook al zo.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://va.vercel-scripts.com",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('content-security-policy', policy)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('content-security-policy', policy)
  return response
}

export const config = {
  matcher: [
    /* Alles behalve de statische build-output en de bestanden uit public/ —
       die hebben geen nonce nodig en zouden er alleen trager van worden. */
    {
      source: '/((?!_next/static|_next/image|assets|favicon.ico|robots.txt|sitemap.xml|site.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
