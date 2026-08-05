import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* De site draaide altijd op mappen met een slash erachter (/werk/, /over/).
     Diezelfde afspraak stond al in vercel.json; hier houdt Next zich eraan,
     zodat bestaande links en de sitemap blijven kloppen. */
  trailingSlash: true,

  reactStrictMode: true,
}

export default nextConfig
