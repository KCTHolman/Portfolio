# Blob-aantal per preset — IJs schaarser

**Status:** ontwerp, klaar voor implementatieplan

## Doel

De aurora-wash (`components/aurora/aurora-stage.tsx`) tekent voor elke preset altijd
dezelfde zes geblurde blobs (`.aur-blob--1` t/m `--6` in `app/styles/aurora.css`) — alleen
kleur en geometrie (`geo`/`drift` in `lib/aurora.ts`) verschillen per preset. Preset "IJs"
moet minder vulling krijgen: minder blobs, zodat er meer van de donkere achtergrond
doorschijnt en de preset ijziger, kouder en leger aanvoelt dan de andere elf. Blob-aantal
wordt daarmee een variabele op preset-niveau, net zoals `geo`, `drift`, `cols` en `motion`
dat al zijn.

Dit raakt alleen IJs. Geen van de andere elf presets krijgt een ander blob-aantal — dit is
geen automatisch afgeleide eigenschap (zoals `deriveFormation` in `lib/fleet-geometry.ts`
het aantal actieve bootjes uit `geo.speed` afleidt), maar een expliciete, per-preset keuze,
op dezelfde manier als `motion: 'build'` vandaag al één-op-één voor preset "Bouwwerk" geldt.

## Uitgangspunten uit het gesprek

- Expliciet veld op de preset, geen formule op basis van `geo.speed` of iets anders — alleen
  IJs wijkt af, de overige elf blijven ongewijzigd op alle zes blobs.
- IJs toont blob 1, 2, 3 en 5. Blob 1 (linksboven, groot, conisch draaiend) en 2
  (rechtsonder, groot, conisch draaiend) dragen de meeste kleur en beweging en blijven de
  herkenbare ankers van de wash; 3 en 5 zijn twee van de vullende gloed-vlekken. Blob 4
  (rechts-midden) en 6 (boven-midden) vallen weg.
- Een wissel van/naar IJs mag nooit een blob laten "poppen". Deze codebase vermijdt cuts
  overal expliciet — de kleur-crossfade (`BLEND_SEC`), de vlootformatie-tween
  (`2026-08-05-aurora-preset-fleet-formation-design.md`) — dus het blob-aantal volgt
  dezelfde regel: een niet-actieve blob dooft uit, hij verdwijnt niet in één frame.
- Geen wijziging aan het override-paneel op `/playground` (`lib/aurora.ts`
  `AuroraOverride`) — dat blijft geo/drift/cols/tcols, blob-aantal is daar geen knop.
- Geen wijziging aan de swatch-previews in de footer (`swatchBackground()` in
  `lib/aurora.ts`) — die tonen een kleurverloop, geen blob-telling.

## Wat er al staat

`components/aurora/aurora-stage.tsx` definieert lokaal `const BLOBS = [1, 2, 3, 4, 5, 6] as
const` en rendert daar zonder voorwaarde overheen: `BLOBS.map((n) => <div key={n}
className={`aur-blob aur-blob--${n}`} />)`. Positie, grootte en kleurbron (`--c1`..`--c5`)
van elke blob liggen vast in CSS, niet in JS. `useAurora()` levert `effectivePreset` — de
actieve `AuroraPreset` (uit `PRESETS` in `lib/aurora.ts`) met een eventuele
`/playground`-override erover gemerged — waar `AuroraStage` al `effectivePreset.geo` uit
leest voor de SVG-filter en de `--soft`/`--speed` custom properties.

`AuroraPreset` (`lib/aurora.ts`) heeft vandaag `name`, optioneel `auto`, optioneel `motion:
'build'`, `geo`, optioneel `drift`, optioneel `cols`, optioneel `tcols`. Elk optioneel veld
dat afwezig is valt terug op een vast, hard-gecodeerd gedrag (geen `motion` → gewone
`khDrift`-zwaai in plaats van bouwen/instorten) — hetzelfde patroon geldt straks voor
`blobs`.

## Architectuur

### `BLOB_IDS` en `blobs` verhuizen naar `lib/aurora.ts`

De lijst blob-nummers is preset-data, geen presentatiedetail, dus de bron van waarheid hoort
bij de andere preset-constanten in `lib/aurora.ts`, niet lokaal in `aurora-stage.tsx`:

```ts
export const BLOB_IDS = [1, 2, 3, 4, 5, 6] as const
export type BlobId = (typeof BLOB_IDS)[number]
```

`AuroraPreset` krijgt een nieuw optioneel veld:

```ts
/** Welke van de zes achtergrond-blobs zichtbaar zijn (zie BLOB_IDS/aur-blob--n in
 *  aurora-stage.tsx/aurora.css). Ontbreekt = alle zes, zoals nu — alleen IJs vult dit in. */
blobs?: readonly BlobId[]
```

Preset "IJs" krijgt `blobs: [1, 2, 3, 5]`. De overige elf presets laten het veld weg.

### `aurora-stage.tsx`: altijd zes divs, actieve markering via klasse

`aurora-stage.tsx` importeert `BLOB_IDS` uit `lib/aurora.ts` in plaats van zijn eigen lokale
`BLOBS` te definiëren, en rendert nog steeds alle zes:

```ts
const activeBlobs = new Set<BlobId>(effectivePreset.blobs ?? BLOB_IDS)
// ...
{BLOB_IDS.map((n) => (
  <div key={n} className={`aur-blob aur-blob--${n}${activeBlobs.has(n) ? '' : ' aur-blob--off'}`} />
))}
```

Alle zes blijven gemount en blijven hun eigen `khSpin`/`khDrift`-animatie draaien — alleen
zichtbaarheid verandert. Dat is bewust: een blob die weer aan gaat (bv. terug naar een
andere preset) moet meteen mee kunnen faden vanaf waar zijn animatie toevallig staat, niet
vanaf een net-gereset begintoestand.

### `aurora.css`: `aur-blob--off` dooft uit in plaats van te verdwijnen

`.aur-blob` krijgt naast de bestaande `transition: filter 2.4s ease` ook een
opacity-transitie, in dezelfde orde van grootte als `BLEND_SEC` (6s) zodat een blob-aantal-
wissel als onderdeel van dezelfde presetwissel-crossfade leest, niet als een los, sneller
knipperend effect:

```css
.aur-blob {
  /* ... bestaande regels ... */
  transition: filter 2.4s ease, opacity 6s ease;
}
.aur-blob--off {
  opacity: 0;
}
```

Geen wijziging aan de bestaande `.aur-blob--1`..`--6`-regels zelf (positie, grootte,
kleurbron, eigen animatie-duur) — die blijven exact zoals ze zijn.

### Narrow-screen block en reduced motion

Het bestaande `@media (max-width: 699px)`-block herdefinieert alleen positie/grootte per
blob-nummer, niet zichtbaarheid — `aur-blob--off` werkt daar ongewijzigd overheen.
`@media (prefers-reduced-motion: reduce)` zet nu al `animation: none` op `.aur-blob`; de
nieuwe `transition: opacity` is geen `animation` en blijft dus actief, wat consistent is met
hoe de bestaande `transition: filter`-lijn zich daar ook al gedraagt (niet uitgeschakeld
onder reduced motion, want het is een eenmalige, milde overgang, geen doorlopende beweging).

## Wat verandert per bestand

- `lib/aurora.ts` — nieuwe `BLOB_IDS`-constante en `BlobId`-type; `AuroraPreset` krijgt
  `blobs?: readonly BlobId[]`; preset "IJs" krijgt `blobs: [1, 2, 3, 5]`.
- `components/aurora/aurora-stage.tsx` — lokale `BLOBS`-constante vervangen door de
  geïmporteerde `BLOB_IDS`; blob-`div`'s krijgen een `aur-blob--off`-klasse als hun nummer
  niet in `effectivePreset.blobs` zit.
- `app/styles/aurora.css` — `.aur-blob` krijgt een `opacity`-transitie naast de bestaande
  `filter`-transitie; nieuwe `.aur-blob--off { opacity: 0; }`.

## Buiten scope

- Geen wijziging aan `AuroraOverride`/het `/playground`-paneel — blob-aantal is daar geen
  instelbare knop.
- Geen wijziging aan de andere elf presets of aan `swatchBackground()`.
- Geen automatische afleiding van blob-aantal uit `geo.speed` of een ander bestaand veld —
  dat blijft voorbehouden aan `deriveFormation` voor de vlootformatie.
- Geen wijziging aan welke `--cN`-kleur bij welke blob hoort.
