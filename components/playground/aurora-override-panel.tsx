'use client'

/* ==========================================================================
   /playground/ — het aurora-override-paneel.

   Los van de Fleet-bediening in playground-view.tsx: dit paneel legt sliders
   en kleurkiezers over de écht actieve aurora-achtergrond (dezelfde
   AuroraProvider die site-breed draait, niet een geïsoleerd voorbeeldvlakje)
   — geometrie, drift en de 8 kleuren (5 "blobs" + 3 "accenten"), puur
   exploratief. Niets wordt bewaard: setOverride(null) (de reset-knop, of het
   wisselen van preset via de bestaande footer-swatches) veegt alles weg, en
   er is geen sessionStorage/URL-state voor. Zie
   docs/superpowers/specs/2026-08-07-playground-aurora-override-design.md.
   ========================================================================== */

import { useState } from 'react'
import { HslColorPicker, HslaColorPicker } from 'react-colorful'

import { useAurora } from '@/components/aurora/aurora-provider'
import { DEFAULT_DRIFT, type Hsl, type Hsla } from '@/lib/aurora'

type GeoKey = 'scale' | 'freq' | 'soft' | 'speed'
type DriftKey = 'amp' | 'period'

/* Bereik ruim rond de spreiding die de 12 presets in lib/aurora.ts al laten
   zien — geen validatie voorbij min/max, dit is een ontwikkelaarspaneel. */
const GEO_FIELDS: { key: GeoKey; min: number; max: number; step: number; decimals: number }[] = [
  { key: 'scale', min: 0, max: 70, step: 1, decimals: 0 },
  { key: 'freq', min: 0, max: 0.04, step: 0.001, decimals: 3 },
  { key: 'soft', min: 0.5, max: 2, step: 0.05, decimals: 2 },
  { key: 'speed', min: 0.1, max: 0.7, step: 0.01, decimals: 2 },
]

const DRIFT_FIELDS: { key: DriftKey; min: number; max: number; step: number; decimals: number }[] = [
  { key: 'amp', min: 0, max: 25, step: 0.5, decimals: 1 },
  { key: 'period', min: 20, max: 150, step: 1, decimals: 0 },
]

type OpenSwatch = { kind: 'col' | 'tcol'; index: number } | null

function hslToObj(c: Hsl): { h: number; s: number; l: number } {
  return { h: c[0], s: c[1], l: c[2] }
}

function hslaToObj(c: Hsla): { h: number; s: number; l: number; a: number } {
  return { h: c[0], s: c[1], l: c[2], a: c[3] }
}

function swatchStyle(c: Hsl | Hsla): { background: string } {
  const a = c.length === 4 ? c[3] : 1
  return { background: `hsla(${c[0]},${c[1]}%,${c[2]}%,${a})` }
}

export function AuroraOverridePanel() {
  const { effectivePreset, override, setOverride } = useAurora()
  const [open, setOpen] = useState<OpenSwatch>(null)

  const geo = effectivePreset.geo
  const drift = effectivePreset.drift ?? DEFAULT_DRIFT
  const isLevend = effectivePreset.auto === true

  function updateGeo(key: GeoKey, value: number) {
    setOverride({ ...override, geo: { ...override?.geo, [key]: value } })
  }

  function updateDrift(key: DriftKey, value: number) {
    setOverride({ ...override, drift: { ...override?.drift, [key]: value } })
  }

  function updateCol(index: number, next: Hsla) {
    const cols = [...(override?.cols ?? new Array(5).fill(null))]
    cols[index] = next
    setOverride({ ...override, cols })
  }

  function updateTcol(index: number, next: Hsl) {
    const tcols = [...(override?.tcols ?? new Array(3).fill(null))]
    tcols[index] = next
    setOverride({ ...override, tcols })
  }

  function toggle(next: NonNullable<OpenSwatch>) {
    setOpen(open?.kind === next.kind && open.index === next.index ? null : next)
  }

  return (
    <div className="kh-pg-panel kh-pg-panel--aurora">
      <div className="kh-pg-sliders">
        {GEO_FIELDS.map((f) => (
          <label className="kh-pg-field kh-pg-field--slider kh-pg-field--geo" key={f.key}>
            <span>
              geo.{f.key} <code>{geo[f.key].toFixed(f.decimals)}</code>
            </span>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={geo[f.key]}
              onChange={(event) => updateGeo(f.key, Number(event.target.value))}
            />
          </label>
        ))}

        {DRIFT_FIELDS.map((f) => (
          <label className="kh-pg-field kh-pg-field--slider kh-pg-field--drift" key={f.key}>
            <span>
              drift.{f.key} <code>{drift[f.key].toFixed(f.decimals)}</code>
            </span>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={drift[f.key]}
              onChange={(event) => updateDrift(f.key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="kh-pg-field">
        <span>kleuren (5 blobs + 3 accenten)</span>
        <div className="kh-pg-swatch-wrap">
          <div className="kh-pg-swatches">
            {(effectivePreset.cols ?? []).map((c, i) => (
              <button
                key={`col-${i}`}
                type="button"
                className="kh-pg-swatch"
                style={swatchStyle(c)}
                aria-label={`blob ${i + 1}`}
                aria-pressed={open?.kind === 'col' && open.index === i}
                onClick={() => toggle({ kind: 'col', index: i })}
              />
            ))}
            {(effectivePreset.tcols ?? []).map((c, i) => (
              <button
                key={`tcol-${i}`}
                type="button"
                className="kh-pg-swatch kh-pg-swatch--accent"
                style={swatchStyle(c)}
                aria-label={`accent ${i + 1}`}
                aria-pressed={open?.kind === 'tcol' && open.index === i}
                onClick={() => toggle({ kind: 'tcol', index: i })}
              />
            ))}
          </div>

          {open?.kind === 'col' && effectivePreset.cols?.[open.index] && (
            <div className="kh-pg-popover">
              <HslaColorPicker
                color={hslaToObj(effectivePreset.cols[open.index])}
                onChange={(c) => updateCol(open.index, [c.h, c.s, c.l, c.a])}
              />
            </div>
          )}
          {open?.kind === 'tcol' && effectivePreset.tcols?.[open.index] && (
            <div className="kh-pg-popover">
              <HslColorPicker
                color={hslToObj(effectivePreset.tcols[open.index])}
                onChange={(c) => updateTcol(open.index, [c.h, c.s, c.l])}
              />
            </div>
          )}
        </div>
      </div>

      <div className="kh-pg-panel-foot">
        {isLevend && (
          <p className="kh-pg-hint">
            Kleur/drift zonder effect op &ldquo;Levend&rdquo; — die berekent zijn kleuren automatisch.
          </p>
        )}
        <button type="button" className="kh-pg-btn" onClick={() => setOverride(null)} disabled={!override}>
          Reset naar preset
        </button>
      </div>
    </div>
  )
}
