import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/metadata'

/* Gegenereerd in plaats van bijgehouden: de zes routes en het publieke adres
   stonden eerder allebei met de hand in sitemap.xml, en dat is precies wat
   tools/set-site-url.py moest rechttrekken na een verhuizing. Nu leest dit uit
   dezelfde SITE_URL als alle canonicals. */

const ROUTES: { path: string; priority: number }[] = [
  { path: '/', priority: 1.0 },
  { path: '/werk/', priority: 0.8 },
  { path: '/werk/readme/', priority: 0.7 },
  { path: '/over/', priority: 0.6 },
  { path: '/contact/', priority: 0.6 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    priority,
  }))
}
