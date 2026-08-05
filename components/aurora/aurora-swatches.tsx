'use client'

/* De presetrij in de footer. Elke swatch rijdt op de live accentvariabelen
   van zijn eigen preset, zodat de rij mee blijft zwaaien in plaats van een
   muur dode duimnagels te zijn. */

import { swatchBackground } from '@/lib/aurora'
import { useAurora } from './aurora-provider'

export function AuroraSwatches() {
  const { presets, activePreset, selectPreset } = useAurora()

  return (
    <div className="aur-presets" role="group" aria-label="Achtergrond">
      {presets.map((preset, index) => (
        <button
          key={preset.name}
          type="button"
          className="aur-preset"
          aria-pressed={activePreset === index}
          title={preset.name}
          aria-label={`Achtergrond ${preset.name}`}
          style={{ background: swatchBackground(preset) }}
          onClick={() => selectPreset(index)}
        />
      ))}
    </div>
  )
}
