# Aurora-override-paneel op /playground

**Status:** ontwerp, klaar voor implementatieplan
**Branch:** nog te kiezen bij implementatie

## Doel

`/playground` laat vandaag alleen de Fleet-variant los van context kiezen. Er komt een
tweede paneel bij: losse sliders en kleurkiezers om de **actieve** aurora-achtergrond
(dezelfde die echt op de pagina staat, niet een geïsoleerd voorbeeldvlakje) live te
overriden — geometrie, drift en de 8 kleuren (5 blobs + 3 accenten) los van elkaar. Puur
exploratief: niets wordt bewaard, een reload of het wisselen van preset veegt de override
weg. Het doel is voelen wat er mogelijk is binnen het bestaande presets-systeem, niet een
nieuwe preset opslaan of exporteren.

## Uitgangspunten uit het gesprek

- Vrij experimenteren, los van de 12 bestaande presets — geen "kies preset, verfijn 'm op
  in `lib/aurora.ts`"-workflow, gewoon voelen wat er kan.
- Raakt de écht zichtbare achtergrond van de hele pagina, niet een los voorbeeldvlakje.
- Geen enkele vorm van bewaren: geen kopieerknop, geen sessionStorage, geen URL-state.
- Voor kleur: geen 24 losse H/S/L-getallen. Een rij van 8 kleine kleurvlakjes (5 blobs + 3
  accenten), die bij een klik een compacte kleurkiezer openen — met een lichtgewicht
  package (`react-colorful`) in plaats van zelf HSL-wiskunde en een picker-UI te bouwen.

## Wat er al staat

`AuroraProvider` (`components/aurora/aurora-provider.tsx`) houdt precies één ding in
React-state: `activePreset` (index in `PRESETS`). Alles wat per frame verandert —
kleuren, blend-voortgang — leeft in refs en wordt in een rAF-loop (`paint()`) rechtstreeks
als CSS custom properties (`--c1..5`, `--t1..3`, `--aur-paint-op`) op `<html>` geschreven.
`switchPreset(index)` start een 6s crossfade (`BLEND_SEC`), duwt de automatische
preset-cyclus (`AUTO_CYCLE_SEC` = 100s) een cyclus vooruit, en bewaart de keuze in
`sessionStorage` (`kh-aurora`) zodat 'm bij page-navigatie blijft staan.

Een preset (`lib/aurora.ts`) is `{ name, auto?, motion?, geo: {scale,freq,soft,speed},
drift?: {amp,period}, cols?: Hsla[5], tcols?: Hsl[3] }`. `computeFrame(presetIndex,
elapsed, bloom)` zoekt vandaag **zelf** `PRESETS[presetIndex]` op en berekent daaruit een
`AuroraFrame` (`{cols, tcols, paintOp}`) — voor preset 0 ("Levend") via een algoritmische
tint-wandeling die `cols`/`tcols` volledig negeert, voor alle andere presets via
drift-gemoduleerde `cols`/`tcols`.

`AuroraStage` (`components/aurora/aurora-stage.tsx`) is losstaand van die loop: een gewone
render die `presets[activePreset].geo` rechtstreeks uit context leest en `scale`/`freq` in
de SVG-vervormingsfilter zet, `soft`/`speed` als CSS-variabelen. Geometrie verandert dus
declaratief bij een presetkeuze, niet per frame.

Er bestaat vandaag geen enkel mechanisme om een los veld van een preset te overschrijven —
`PRESETS` is een statische, readonly array en zowel `computeFrame` als `AuroraStage` lezen
'm rechtstreeks.

**Ook `deriveFormation`** (`lib/fleet-geometry.ts`) leest `PRESETS[presetIndex]`
rechtstreeks — `preset.drift ?? DEFAULT_DRIFT` bepaalt mee hoe de vlootformatie schuift
(zie `2026-08-05-aurora-preset-fleet-formation-design.md`). `Fleet`
(`components/fleet.tsx`) geeft `activePreset` uit `useAurora()` door aan die functie, en
`Fleet` staat ook op `/playground`. Dit override-mechanisme raakt die weg bewust niet aan
(zie Buiten scope) — een drift-override verandert dus de kleur-zwaai, maar niet hoe de
vloot ernaast staat.

## Architectuur

### Eén nieuw begrip: `AuroraOverride`, en `computeFrame` wordt preset-object-based

`Hsl`/`Hsla` zelf zijn vandaag niet geëxporteerd (`lib/aurora.ts:16-17`) — nodig voor
`AuroraOverride`'s eigen types, en de tuple↔object-mapping in `playground-view.tsx` zal ze
ook willen noemen, dus die twee `type`-declaraties krijgen een `export` erbij.

```ts
// lib/aurora.ts
export type AuroraOverride = {
  geo?: Partial<AuroraGeometry>
  drift?: Partial<AuroraDrift>
  cols?: readonly (Hsla | null)[]   // per index: null/afwezig = val terug op de preset
  tcols?: readonly (Hsl | null)[]
}

export function applyOverride(preset: AuroraPreset, override: AuroraOverride | null): AuroraPreset {
  if (!override) return preset
  return {
    ...preset,
    geo: override.geo ? { ...preset.geo, ...override.geo } : preset.geo,
    drift: override.drift ? { ...(preset.drift ?? DEFAULT_DRIFT), ...override.drift } : preset.drift,
    cols: preset.cols && override.cols ? preset.cols.map((c, i) => override.cols?.[i] ?? c) : preset.cols,
    tcols: preset.tcols && override.tcols ? preset.tcols.map((c, i) => override.tcols?.[i] ?? c) : preset.tcols,
  }
}
```

`computeFrame` verandert van `computeFrame(presetIndex: number, ...)` naar
`computeFrame(preset: AuroraPreset, ...)` — de aanroeper geeft nu het (eventueel
gemergede) preset-object mee in plaats van een index waarmee de functie zelf in `PRESETS`
zoekt. De twee bestaande aanroepen in `aurora-provider.tsx` (`paint()` en de
`lastFrameRef`-fallback in `switchPreset()`) worden aangepast; verder heeft niets in de
codebase `computeFrame` in gebruik.

Dit is de kern: één zuivere merge-functie, één signatuurwijziging, en zowel de kleurloop
als `AuroraStage` kunnen straks uit dezelfde, al-gemergede bron lezen — geen dubbele
mergelogica op twee plekken.

### `AuroraProvider`: override als state + ref, `effectivePreset` in context

Zelfde dubbele patroon als `activePreset`/`presetRef` nu al heeft: `override` als
`useState<AuroraOverride | null>` (voor consumers die op React-render leunen, zoals
`AuroraStage`) plus `overrideRef` (voor de imperatieve `paint()`-loop, die niet op elke
override-wijziging een nieuwe functie-identiteit mag krijgen).

```ts
type AuroraContextValue = {
  // ...bestaande velden ongewijzigd...
  override: AuroraOverride | null
  setOverride: (next: AuroraOverride | null) => void
  /** presets[activePreset] mét override erover gemerged — waar AuroraStage en het
   *  playground-paneel uit lezen in plaats van zelf presets[activePreset] te pakken. */
  effectivePreset: AuroraPreset
}
```

- `setOverride(next)` is een platte setter (geen eigen mergelogica in de provider) — de
  aanroeper (het playground-paneel) geeft steeds het complete, gewenste object mee.
  `null` betekent: geen override, terug naar de kale preset.
- `switchPreset(index)` roept er als eerste stap `setOverride(null)` bij aan — vóór de
  bestaande vroege `return` (`if (index === presetRef.current && !blendRef.current)
  return`, `aurora-provider.tsx:163`). Zonder die volgorde zou het opnieuw aanklikken van
  de al-actieve footer-swatch tijdens een override 'm stilletjes laten staan in plaats van
  hem te wissen. Een nieuwe preset is een schone basis om vanaf te experimenteren, geen
  stapeling op wat je net aan het overriden was.
- `paint()` leest `overrideRef.current`, bouwt `applyOverride(PRESETS[presetRef.current]
  ?? PRESETS[0], overrideRef.current)` en geeft dát aan `computeFrame` mee — instant,
  zonder de 6s crossfade (die blijft uitsluitend voor echte presetwissels via
  `blendRef`).
- De automatische cyclus (`advanceAutoCycle`) mag niet ingrijpen terwijl er een override
  actief is — de bestaande check `elapsed >= nextSwitchAtRef.current` krijgt er
  `&& !overrideRef.current` bij.
- **Geen persistentie**: `writeSession()` schrijft alleen `{preset, t0, nextSwitchAt}` —
  `override` komt daar bewust niet bij, dus een reload of nieuw tabblad ziet 'm nooit.
- `setOverride` schrijft, net als `switchPreset` vandaag al doet voor `activePreset`, in
  één moeite door de state (`setOverrideState`, voor React-render-consumers) én de ref
  (`overrideRef.current`, voor de imperatieve loop) — geen van beide zonder de ander.

### `AuroraStage`: lezen uit `effectivePreset` in plaats van `presets[activePreset]`

```ts
const { effectivePreset, reducedQuality, tabHidden } = useAurora()
const geo = effectivePreset.geo
const stageClassName =
  (effectivePreset.motion === 'build' ? 'aur-stage aur-stage--build' : 'aur-stage') + ...
```

Twee plekken in dit bestand lezen vandaag `preset?.geo`/`preset?.motion` — beide gaan naar
`effectivePreset`. `applyOverride` spreadt `motion` ongewijzigd door (geen override-veld
ervoor), dus dit is voor `motion` geen gedragswijziging, alleen dezelfde bron als `geo` nu
al gebruikt.

### Randgeval: preset 0 ("Levend") negeert kleur/drift-overrides

`computeFrame`'s bestaande `auto`-tak berekent `cols`/`tcols` algoritmisch en negeert
`p.cols`/`p.tcols` volledig — dus ook een gemergede override op die velden heeft daar
geen effect (in `applyOverride` blijft `preset.cols` `undefined` op Levend, dus de
`override.cols`-tak wordt nooit genomen). `drift` wordt in diezelfde `auto`-tak ook nooit
gelezen. **Geometrie werkt overal**, kleur en drift alleen op de 11 niet-levende presets.
Zowel de kleurvlakjes als de twee drift-sliders blijven op Levend gewoon interactief —
ze doen dan alleen niets zichtbaars. Het paneel toont in plaats daarvan één regel uitleg
zodra Levend actief is; er wordt bewust niets disabled.

## Panel-UI (`components/playground/playground-view.tsx`)

Nieuwe sectie, met dezelfde `.kh-pg-panel`/`.kh-pg-field`-klassen als het bestaande
journey-paneel:

- **Geometrie** — 4 sliders: `scale`, `freq`, `soft`, `speed`. Bereik per slider ruim rond
  de spreiding die de 12 presets al laten zien (bv. `scale` 0–70, `freq` 0–0.04).
- **Drift** — 2 sliders: `amp`, `period`.
- **Kleuren** — rij van 8 kleine vlakjes (5 "blobs" + 3 "accenten"), visueel gelijk aan de
  bestaande `.aur-preset`-swatches in de footer. Een klik open een compacte
  `HslaColorPicker` (blobs, hebben alpha) / `HslColorPicker` (accenten, geen alpha) van
  `react-colorful` in een popover, gebonden aan precies die ene kleur.
- **Reset naar preset** — knop die `setOverride(null)` aanroept.

Elke control initialiseert vanuit `effectivePreset` (dus: leeg override = toont de actieve
preset z'n eigen waarden) en roept bij een wijziging `setOverride({ ...override, geo: {
...override?.geo, scale: nextValue } })` (of het kleur-equivalent) aan.

Preset-keuze zelf loopt via de al bestaande footer-swatches (site-breed) — er komt geen
tweede preset-picker binnen het playground-paneel.

## Nieuwe dependency

`react-colorful` (~2.8kB, geen eigen dependencies) — `HslColorPicker`/`HslaColorPicker`
rekenen rechtstreeks in HSL(A), dus geen kleurruimte-omrekening naar/van RGB nodig. Ze
nemen en leveren wél een **object** (`{h,s,l}`/`{h,s,l,a}`), geen tuple — dit project
gebruikt overal `readonly [h,s,l]`/`readonly [h,s,l,a]`. Elke swatch heeft dus een kleine
shape-mapping nodig op zowel de `color`-prop (tuple → object) als `onChange` (object →
tuple); geen kleurwiskunde, maar wel iets om niet per ongeluk over te slaan.

## Wat verandert per bestand

- `lib/aurora.ts` — nieuw `AuroraOverride`-type en `applyOverride()`; `computeFrame` van
  index- naar preset-object-signatuur.
- `components/aurora/aurora-provider.tsx` — `override`-state/-ref, `setOverride`,
  gememoiseerde `effectivePreset` in context; `paint()`/`switchPreset()` gebruiken de
  gemergede preset; auto-cyclus gepauzeerd tijdens een override; `switchPreset` wist de
  override.
- `components/aurora/aurora-stage.tsx` — leest `effectivePreset` in plaats van
  `presets[activePreset]`.
- `components/playground/playground-view.tsx` — nieuw paneel: geometrie-/drift-sliders,
  kleurenrij met popover-pickers, reset-knop.
- `app/styles/playground.css` — stijl voor de kleurenrij en de picker-popover.
- `package.json` — `react-colorful` toegevoegd.

## Buiten scope

- Geen presets bewaren, exporteren of kopiëren — puur exploratief, niets overleeft een
  reload.
- Geen tweede, geïsoleerde preview — de override werkt op de echte, pagina-vullende
  achtergrond.
- Geen wijziging aan de bestaande footer-swatches, de crossfade-duur, de auto-cyclus-duur,
  of het SVG-filter zelf (alleen de al-bestaande `scale`/`freq`-parameters die erin
  gaan worden nu ook via override stuurbaar, niet de filteropbouw).
- Geen validatie/clamping voorbij de sliders' eigen `min`/`max` — dit is een
  ontwikkelaarspaneel, geen publiek-gerichte UI.
- **`deriveFormation`/`Fleet` blijven buiten bereik van de override.** Een drift-override
  verandert de kleur-zwaai van de wash, maar niet hoe `Fleet` zijn formatie daarop baseert
  — dat blijft rechtstreeks uit `PRESETS[activePreset]` lezen, ongeacht een actieve
  override. Bewuste keuze: dit paneel gaat over de wash, niet over de vloot, en
  `deriveFormation` meenemen zou een tweede, groter mechanisme (`Fleet`/`useFleetScene`)
  in de override-doorgifte trekken voor een puur exploratief paneel.
