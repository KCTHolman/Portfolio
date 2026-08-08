# Zon- en bliksem-cyclus — signature motion voor Zonsondergang en Onweer

**Status:** ontwerp, klaar voor implementatieplan

## Doel

`motion: 'build'` (preset "Bouwwerk") is vandaag de enige preset met een eigen, van de
standaard `khDrift`-zwaai afwijkende beweging. Twee andere presets moeten zo'n eigen
signature motion krijgen, zodat ze meer tot hun recht komen:

- **Zonsondergang** — één blob onderaan moet duidelijk de zon zijn: een volle gloeiende
  schijf die in 20 seconden merkbaar donkerder wordt en dan weer opklaart, in een
  doorlopende cyclus.
- **Onweer** — één blob licht kort op, met een paar snelle flikkeringen kort na elkaar
  (zoals echte bliksem), gevolgd door een lange stille pauze, ook in een doorlopende
  cyclus.

Dit raakt alleen deze twee presets. De negen overige (inclusief "Bouwwerk", dat zijn
`motion: 'build'` behoudt) blijven ongewijzigd.

## Uitgangspunten uit het gesprek

- **Zon-cyclus is ademend, niet zaagtand**: 20s geleidelijk donkerder, daarna even
  geleidelijk weer terug naar vol — symmetrisch heen-en-weer, geen abrupte reset.
- **Blob 2** wordt de zon — de enige blob onderaan die al een perfecte cirkel is
  (`border-radius: 50%`, `width`/`height` beide `54vw`). Blob 5 (ook onderaan) is ovaler
  en zachter en was de andere optie, maar niet gekozen.
- **Vorm** verandert voor Zonsondergang specifiek van de huidige conic-gradient
  (kleur alleen in een boog, met doorzichtige taartpunten) naar een volle radial-gradient
  schijf — maar **niet overdreven**: gematigde dim-amplitude, en geen aparte vaste
  "zon"-kleur. De schijf blijft gebouwd op `var(--c2)`, dezelfde kleurbron die blob 2 nu
  al gebruikt, zodat hij meezwaait met Zonsondergangs eigen tint-drift in plaats van een
  hardgecodeerde vreemde eend te worden.
- **Positie van blob 2 verandert niet** — alleen vorm en een nieuwe helderheidscyclus.
- **Bliksem is één specifieke blob**, geen flash over het hele scherm.
- **Liefst 3 flikkeringen per cyclus**, met oog voor CPU-kosten — dus een goedkope,
  opacity-only aanpak in plaats van een animatie op een filter-eigenschap.

## Wat er al staat

`components/aurora/aurora-stage.tsx:26` kiest nu tussen twee stage-classNamen:
`effectivePreset.motion === 'build' ? 'aur-stage aur-stage--build' : 'aur-stage'`. Dat is
de enige plek waar `motion` iets doet — de rest van het rendered blob-`div`'s is voor elke
preset identiek (`BLOBS.map(...)`, zie regel 73-75).

`app/styles/aurora.css` regelt `motion: 'build'` volledig via CSS: `.aur-stage--build
.aur-blob--3`/`--5` krijgen `khBuildUp` (regel 224-231), `--4`/`--6` krijgen `khTearDown`
(regel 233-241) — allebei vervangen ze de standaard `khDrift`/`khDrift2`-zwaai van die blob
volledig. Geen JS is hierbij betrokken; `computeFrame` in `lib/aurora.ts` weet niets van
`motion` en hoeft dat ook niet te weten.

De relevante blobs vandaag:

```css
.aur-blob--2 {
  bottom: 0%; right: 4%; width: 54vw; height: 54vw; border-radius: 50%;
  background: conic-gradient(from 120deg, transparent 0deg, var(--c2) 90deg, var(--c3) 220deg, transparent 340deg);
  filter: blur(calc(var(--soft) * 34px));
  animation: khSpinRev 62s linear infinite, khDrift2 30s ease-in-out infinite;
  animation-duration: calc(62s / var(--speed)), calc(30s / var(--speed));
}
.aur-blob--6 {
  top: 10%; left: 42%; width: 42vw; height: 48vh;
  background: radial-gradient(50% 50% at 50% 50%, var(--c4) 0%, transparent 72%);
  filter: blur(calc(var(--soft) * 44px));
  animation: khDrift2 24s ease-in-out infinite;
  animation-duration: calc(24s / var(--speed));
}
```

`.aur-breathe` (regel 97-104) laat zien hoe deze codebase al "helderder/donkerder"
doet zonder de dure route: een aparte, filter-loze overlay-laag met
`mix-blend-mode: overlay` die alleen `opacity` animeert — expliciet zo gekozen omdat
"animating any part of a filter chain forces the browser to re-rasterize the whole
chain". Dezelfde truc is het uitgangspunt voor de bliksem-overlay hieronder.

`.aur-stage--paused .aur-blob, ... .aur-breathe, ... .aur-grain` (regel 363-366) pauzeert
alle losse CSS-animaties op een verborgen tabblad; `@media
(prefers-reduced-motion: reduce)` (regel 350-357) zet ze uit, met expliciet
`.aur-stage--build .aur-blob` erbij náást de generieke `.aur-blob` — nodig omdat die
regel anders door de hogere specificiteit van `.aur-stage--build .aur-blob--3` verslagen
zou worden. Elke nieuwe preset-specifieke override moet zich op dezelfde manier aanmelden
bij beide blokken.

## Architectuur

### `motion` uitbreiden naar drie waarden

`lib/aurora.ts`:

```ts
/** 'build': ... (bestaande uitleg blijft staan)
 *  'sunset': blob 2 wordt een ademende zonneschijf — zie khSunset in aurora.css.
 *  'storm': blob 6 flikkert kort, drie keer, via de losse .aur-flash-overlay
 *  — zie khLightning in aurora.css. */
motion?: 'build' | 'sunset' | 'storm'
```

Preset "Zonsondergang" krijgt `motion: 'sunset'`, preset "Onweer" krijgt
`motion: 'storm'`. Geen andere velden op die presets veranderen.

`components/aurora/aurora-stage.tsx` generaliseert de class-keuze in plaats van een derde
ternary-tak toe te voegen:

```ts
const stageClassName =
  'aur-stage' +
  (effectivePreset.motion ? ` aur-stage--${effectivePreset.motion}` : '') +
  (tabHidden ? ' aur-stage--paused' : '')
```

### Zonsondergang — `khSunset` op blob 2

```css
.aur-stage--sunset .aur-blob--2 {
  background: radial-gradient(52% 52% at 50% 50%, var(--c2) 0%, transparent 70%);
  animation: khDrift2 30s ease-in-out infinite, khSunset 40s ease-in-out infinite;
  animation-duration: calc(30s / var(--speed)), calc(40s / var(--speed));
}
@keyframes khSunset {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.45; }
}
```

De spin (`khSpinRev`) valt weg: die draait vandaag een kleurboog rond een conic-gradient,
maar op een symmetrische radial-gradient schijf zou die rotatie niets laten zien — puur
verspilde rasterisatie. De positie-drift (`khDrift2`) blijft, zodat de zon net als nu
zachtjes blijft bewegen; `khSunset` legt daar alleen een opacity-cyclus overheen (aparte
eigenschap, dus geen conflict met de transform-animatie ernaast — zelfde manier waarop
`.aur-blob--1` vandaag al twee transform-animaties combineert).

`0.45` als dieptepunt is een startwaarde voor "merkbaar donkerder, niet overdreven"; die
stel ik in de browser bij zodra de cyclus echt beweegt. 40s totaal geeft precies 20s om te
verdonkeren en 20s om terug te helderen, zoals gevraagd.

### Onweer — `khLightning` via een nieuwe `.aur-flash`-overlay

Blob 6 zelf blijft ongewijzigd (zijn `background`/`filter`/drift raken we niet aan) — in
plaats daarvan komt er een tweede, altijd-gemonteerde overlay-laag die exact op zijn
positie/formaat ligt, naar het voorbeeld van `.aur-breathe`:

```css
.aur-flash {
  position: absolute;
  top: 10%; left: 42%; width: 42vw; height: 48vh;
  pointer-events: none;
  mix-blend-mode: screen;
  background: radial-gradient(50% 50% at 50% 50%, rgba(255, 255, 255, 0.9) 0%, transparent 70%);
  opacity: 0;
}
.aur-stage--storm .aur-flash {
  animation: khLightning 16s ease-out infinite;
  animation-duration: calc(16s / var(--speed));
}
@keyframes khLightning {
  0%, 100% { opacity: 0; }
  1%       { opacity: 0.85; }
  2%       { opacity: 0.05; }
  3%       { opacity: 0.6; }
  4%       { opacity: 0.05; }
  5.5%     { opacity: 0.95; }
  7%       { opacity: 0; }
}
```

Drie flikkeringen (verschillende piekhoogtes, zoals echte bliksem nooit twee keer
identiek flikkert) binnen de eerste ~1s van een 16s cyclus, dan ~15s stilte. Buiten
`.aur-stage--storm` blijft `.aur-flash` op `opacity: 0` zonder animatie — geen kosten voor
de andere tien presets, op één extra, verder inerte `div` na.

Dit is bewust een aparte overlay-laag en geen animatie op blob 6's eigen `filter`: die
zit al op `filter: blur(...)`, en elke wijziging daarbinnen (bv. een `brightness()`
toevoegen en animeren) zet de browser aan het herrasterizeren van die hele laag — precies
de kostenval die `.aur-breathe` hierboven al vermijdt door apart en opacity-only te
blijven. `.aur-flash` dupliceert bewust blob 6's positiegetallen (`top`/`left`/`width`/
`height`) in plaats van een gedeelde variabele te introduceren — elke blob-regel in dit
bestand is nu al een eigen, letterlijke set getallen zonder gedeelde afleiding, dus dat
past bij hoe het bestand al is opgebouwd.

`aurora-stage.tsx` krijgt de nieuwe `div` naast de bestaande `aur-breathe`:

```tsx
<div className={paintClassName}>
  {BLOBS.map((n) => (
    <div key={n} className={`aur-blob aur-blob--${n}`} />
  ))}
  <div className="aur-breathe" />
  <div className="aur-flash" />
</div>
```

### Reduced motion & verborgen tabblad

Beide nieuwe blokken melden zich aan bij dezelfde twee plekken als `motion: 'build'` dat
al doet:

```css
@media (prefers-reduced-motion: reduce) {
  .aur-blob,
  .aur-stage--build .aur-blob,
  .aur-stage--sunset .aur-blob,
  .aur-stage--storm .aur-blob,
  .aur-grain,
  .aur-stage,
  .aur-paint,
  .aur-breathe,
  .aur-flash { animation: none; }
}

.aur-stage--paused .aur-blob,
.aur-stage--paused .aur-paint,
.aur-stage--paused .aur-breathe,
.aur-stage--paused .aur-flash,
.aur-stage--paused .aur-grain { animation-play-state: paused; }
```

`.aur-stage--sunset .aur-blob` en `.aur-stage--storm .aur-blob` zijn nodig in het
reduced-motion-blok om dezelfde reden als `.aur-stage--build .aur-blob` er al staat: hun
specificiteit (twee classes) moet die van `.aur-stage--sunset .aur-blob--2` evenaren, en
staat verderop in het bestand zodat de brontekst-volgorde 'm laat winnen. Het
paused-blok heeft dat niet nodig voor de blobs zelf (de generieke `.aur-blob` daar wint al
op dezelfde manier), maar wel voor de nieuwe `.aur-flash`-class, die door geen bestaande
regel gedekt wordt.

## Wat verandert per bestand

- `lib/aurora.ts` — `motion` van `'build'` naar `'build' | 'sunset' | 'storm'`; preset
  "Zonsondergang" krijgt `motion: 'sunset'`, preset "Onweer" krijgt `motion: 'storm'`.
- `components/aurora/aurora-stage.tsx` — `stageClassName` generaliseert naar elke
  `motion`-waarde; nieuwe `<div className="aur-flash" />` naast `aur-breathe`.
- `app/styles/aurora.css` — nieuwe `.aur-stage--sunset .aur-blob--2`-regel + `khSunset`
  keyframe; nieuwe `.aur-flash`-basisregel, `.aur-stage--storm .aur-flash`-regel en
  `khLightning`-keyframe; beide nieuwe klassen toegevoegd aan het
  `prefers-reduced-motion`-blok en (voor `.aur-flash`) aan het `--paused`-blok.

## Buiten scope

- Geen signature motion voor de overige negen presets (Aurora, Nevel, Weelde, Sintel,
  IJs, Citrus, Inkt, Koraal, Levend) — dit ontwerp bewijst het patroon voor twee presets;
  uitbreiden naar meer is toekomstig werk als dit bevalt.
- Geen wijziging aan `AuroraOverride`/het `/playground`-paneel — `motion` was daar al geen
  instelbare knop voor "Bouwwerk", en blijft dat voor deze twee ook.
- Geen wijziging aan `swatchBackground()` (de footer-previews) — die tonen een statisch
  kleurverloop, geen motion.
- Geen JS-kleurwiskunde-aanpassing in `computeFrame` — beide effecten zijn pure
  CSS-keyframes, net als `motion: 'build'` dat vandaag al is.
- Geen aanpassing van blob 2 of blob 6's kleurbron (`--c2`/`--c4`) of van welke blob bij
  welke `--cN` hoort.
