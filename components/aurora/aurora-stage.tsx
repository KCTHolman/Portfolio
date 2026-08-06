'use client'

/* De wash zelf: zes zwaar geblurde blobs achter een SVG-displacementfilter,
   met korrel en vignet erover.

   Geometrie hoort bij de preset en verandert alleen als je er een kiest —
   daarom staat ze hier declaratief in de JSX in plaats van dat een loop elk
   frame setAttribute doet. Elke schrijf op feTurbulence/feDisplacementMap
   dwingt een volledige her-rasterisatie van een schermvullend filter, en dat
   is precies wat je anders als schokken ziet. De vorm blijft bewegen via de
   blob-animaties, en die lopen op de GPU. */

import type { CSSProperties } from 'react'

import { BASE_GEOMETRY } from '@/lib/aurora'
import { useAurora } from './aurora-provider'

const BLOBS = [1, 2, 3, 4, 5, 6] as const

export function AuroraStage() {
  const { presets, activePreset, reducedQuality } = useAurora()
  const preset = presets[activePreset]
  const geo = preset?.geo ?? BASE_GEOMETRY
  const stageClassName = preset?.motion === 'build' ? 'aur-stage aur-stage--build' : 'aur-stage'
  /* Op een machine die dit al niet bijhoudt (zie de framegat-meting in
     aurora-provider.tsx) laat de duurste losse laag weg: het
     SVG-vervormingsfilter dwingt een volledige software-rasterisatie van de
     hele, schermvullende laag af, telkens als een kleurwissel 'm herschildert.
     De zes geblurde, drijvende blobs zelf blijven gewoon staan — alleen de
     verf-textuur erover valt weg. */
  const paintClassName = reducedQuality ? 'aur-paint aur-paint--lite' : 'aur-paint'

  return (
    <div aria-hidden="true">
      <svg className="aur-defs" aria-hidden="true" focusable="false">
        <filter id="kh-paint">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={`${geo.freq.toFixed(4)} ${(geo.freq * 1.35).toFixed(4)}`}
            numOctaves={3}
            seed={7}
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale={geo.scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter id="kh-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} />
        </filter>
      </svg>

      <div
        className={stageClassName}
        style={
          {
            '--soft': geo.soft.toFixed(3),
            '--speed': geo.speed.toFixed(3),
          } as CSSProperties
        }
      >
        <div className={paintClassName}>
          {BLOBS.map((n) => (
            <div key={n} className={`aur-blob aur-blob--${n}`} />
          ))}
        </div>
        <svg className="aur-grain" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <rect width="100%" height="100%" filter="url(#kh-grain)" />
        </svg>
        <div className="aur-vignette" />
      </div>
    </div>
  )
}
