import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* De site draaide altijd op mappen met een slash erachter (/werk/, /over/).
     Diezelfde afspraak stond al in vercel.json; hier houdt Next zich eraan,
     zodat bestaande links en de sitemap blijven kloppen. */
  trailingSlash: true,

  reactStrictMode: true,

  /* Over en Contact zijn samengevoegd tot één pagina; bestaande links naar
     de losse routes blijven werken via een permanente redirect. */
  async redirects() {
    return [
      { source: '/over', destination: '/koen-holman', permanent: true },
      { source: '/contact', destination: '/koen-holman', permanent: true },
      { source: '/security.txt', destination: '/.well-known/security.txt', permanent: true },
    ]
  },
}

export default nextConfig
