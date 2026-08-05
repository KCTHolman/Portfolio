'use client'

/* Fleet zelf is al 'use client', maar zonder deze omweg zit hij toch gewoon in
 * de hoofdbundel van elke pagina die hem gebruikt: de scène in
 * lib/use-fleet-scene.ts + lib/fleet-geometry.ts is samen ruim 2000 regels,
 * puur decoratief (aria-hidden), en niet nodig voor de eerste paint van de
 * tekst. next/dynamic met ssr:false knipt 'm naar een eigen chunk die pas ná
 * hydration van de echte inhoud laadt.
 *
 * ssr:false mag alleen binnen een client component staan — vandaar dit eigen
 * bestand met 'use client' erboven, in plaats van de dynamic()-aanroep in elke
 * server component die Fleet gebruikt te herhalen. */

import dynamic from 'next/dynamic'

export const Fleet = dynamic(() => import('./fleet').then((mod) => mod.Fleet), { ssr: false })
