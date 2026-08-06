'use client'

/* Kiest bij het laden willekeurig één van de vier homepage-scènes (zie
   lib/use-home-scene.ts) en rendert de bijbehorende vloot-variant. Eigen
   bestand, niet inline in app/page.tsx: dat laatste is een server-component,
   en useHomeScene() heeft React-state nodig. */

import { Fleet } from '@/components/fleet-lazy'
import { useHomeScene } from '@/lib/use-home-scene'

const VARIANT_BY_SCENE = {
  fleet: 'hero',
  compass: 'home-compass',
  gear: 'home-gear',
  rocket: 'home-rocket',
} as const

export function HomeScene() {
  const scene = useHomeScene()
  return <Fleet variant={VARIANT_BY_SCENE[scene]} />
}
