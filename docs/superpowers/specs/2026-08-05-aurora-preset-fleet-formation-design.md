# Vlootformatie per aurora-preset

**Status:** ontwerp, klaar voor implementatieplan
**Branch:** `claude/werk-scroll-vloot`

## Doel

De preset-knoppen in de footer (`.aur-preset`, `components/aurora/aurora-swatches.tsx`)
veranderen vandaag alleen de kleurwas via `AuroraProvider`. Een preset-klik moet daarnaast
de vlootformatie laten meebewegen: de grote boot verplaatst, kleine bootjes varen weg of
komen nieuw aan. Dit geldt voor zowel de `hero`-vloot (homepage) als de `ambient`-vloot
(alle overige pagina's) — de swatches staan in de globale footer, dus buiten
`AuroraProvider` valt elke pagina met een `<Fleet>` erin.

Harde eis: het moet blijven kloppen als iemand snel meerdere presets achter elkaar
aanklikt. Geen wachtrij van animaties, geen opeenstapeling — de vloot moet altijd
convergeren naar de formatie die bij de *laatst* gekozen preset hoort, vloeiend vanaf waar
hij op dat moment ook staat.

## Uitgangspunten uit het gesprek

- Geldt voor zowel `hero` als `ambient`.
- Formaties komen procedureel uit de bestaande preset-data (`geo`/`drift` in
  `lib/aurora.ts`), niet uit 11 met de hand getekende lay-outs.
- `ambient` krijgt ook een herkenbare grote boot (vandaag zijn alle 5 boten klein).
- De overgang duurt ongeveer even lang als de bestaande kleur-blend (`BLEND_SEC = 6`), zodat
  een presetwissel als één samenhangend moment leest in plaats van twee losse animaties.
- "Verplaatsen" voor de grote boot, "wegvaren"/"aankomen" voor de kleintjes — geen boot
  verandert van formaat, alleen van positie/helling.

## Wat er al staat

`lib/fleet-geometry.ts` exporteert `HERO_BOATS` (7 `BoatSpec`: 1 leidende boot + 6 kleine)
en `AMBIENT_BOATS` (5 kleine `BoatSpec`), elk met vaste `cx`/`cy`/`w`/`depth`/`par`/`heel`.
`lib/use-fleet-scene.ts` bouwt daaruit ooit — bij mount en bij resize — een `Boat[]` plus de
bijbehorende deeltjes (`buildBoat()`), en tekent ze elke frame op canvas. De positie van een
boot (`boat.px`/`py`) wordt vandaag precies één keer per lay-out berekend uit
`boat.cx`/`cy`, en blijft daarna vast staan (afgezien van de bestaande deining —
`bob`/`rock`/`sway` — die om die vaste positie heen zwiept).

`components/aurora/aurora-provider.tsx` houdt `activePreset` als enige React-state; alles
wat per frame verandert zit in refs. `switchPreset(index)` is puur "schrijf het nieuwe doel
weg", niet "speel een animatie af" — de kleur-blend zelf gebeurt in de tekenlus die toch al
draait. Dezelfde scheiding — declaratief kiezen, imperatief per frame naar het doel toe
bewegen — is het patroon dat dit ontwerp voor de vloot hergebruikt.

## Architectuur

### Eén doel, geen wachtrij

Elke boot krijgt naast zijn huidige positie (`tcx`/`tcy`/`theel`, "tweened", ooit begonnen
bij de ankerwaarde uit `HERO_BOATS`/`AMBIENT_BOATS`) een *doel* (`dcx`/`dcy`/`dheel`). Elke
frame schuift de huidige waarde exponentieel naar het doel:

```
tcx += (dcx - tcx) * (1 - exp(-dt / TAU))
```

`TAU ≈ 2s`, zodat de overgang na ongeveer 6 seconden voor zo'n 95% voltooid is — in de buurt
van `BLEND_SEC`. Dit is dezelfde aanpak als de bestaande muis-smoothing
(`pointer.x += (pointer.tx - pointer.x) * 0.06`) in `use-fleet-scene.ts`, nu met een
tijd-gebaseerde factor in plaats van een vaste framefactor.

Dit is de kern van de robuustheid: er is precies één doel per boot, geen animatiewachtrij.
Een preset-klik doet niets anders dan `dcx`/`dcy`/`dheel` overschrijven. Klik iemand vijf keer
snel achter elkaar, dan buigt de boot gewoon telkens bij vanaf waar hij op dat moment staat,
naar het nieuwste doel. Er is geen onderscheid tussen "aankomen", "wegvaren" en "gewoon
verplaatsen" in de code — het is overal dezelfde formule; alleen de waarde van het doel
verschilt (een geparkeerde boot heeft een doel buiten beeld).

### Van declaratief naar imperatief: `setFormation`

`Fleet` leest `activePreset` via `useAurora()` en geeft dat door aan `useFleetScene`. De
grote scène-opbouw-`useEffect` in `use-fleet-scene.ts` (die canvas, deeltjes en de tekenlus
opzet) mag **niet** opnieuw draaien bij een preset-wissel — dat zou de hele intro-animatie en
muisstaat resetten. In plaats daarvan:

1. Binnen die effect wordt, na `build()`, een lokale functie `setFormation(index, snap)`
   gedefinieerd die voor elke boot `dcx`/`dcy`/`dheel` bijwerkt (uit `deriveFormation`, zie
   hieronder). Het tweede argument, `snap`, bepaalt of `tcx`/`tcy`/`theel` meteen gelijkgezet
   worden aan het doel in plaats van te tweenen: dat gebeurt altijd bij de allereerste aanroep
   (mount) en bij een resize, en verder alleen als `frozen`. Na een snap dwingt de functie één
   herteken-`draw()` af — bij mount en resize gebeurt dat toch al als onderdeel van de
   bestaande opzet-/resize-volgorde, dus alleen de `frozen`-tak roept zelf expliciet `draw()`
   aan.
2. Die functie wordt weggeschreven in een `ref` (bv. `sceneRef.current = { setFormation }`),
   opgezet aan het eind van de effect en opgeruimd in de cleanup.
3. Een aparte, kleine `useEffect(() => { presetIndexRef.current = presetIndex;
   sceneRef.current?.setFormation(presetIndex, false) }, [presetIndex])` roept 'm aan wanneer
   de preset verandert — zonder de grote effect te raken, en altijd tweenend (`snap = false`),
   ook tijdens `frozen` (waar `setFormation` het zelf naar een snap omzet). Dezelfde
   `presetIndexRef` is wat `onResize` straks afleest (punt 4 en de resize-paragraaf hieronder):
   die effect is de enige plek die 'm bijwerkt.
4. Bij mount wordt `setFormation(huidige preset, snap = true)` aangeroepen vóór de eerste
   `layout()`, zodat `tcx`/`tcy` een zinnig startpunt hebben (zie hieronder, "Gevolgen voor de
   bestaande opbouwanimatie"). `onResize` doet hetzelfde: na `build()` opnieuw
   `setFormation(laatst bekende presetIndex, snap = true)` vóór `layout()` — de preset-index
   zelf staat inmiddels ook in een ref (bijgewerkt door dezelfde kleine effect uit punt 3),
   dus `onResize` kan 'm aflezen zonder afhankelijk te zijn van React-state.

### Formatie afleiden uit preset-data

Een nieuwe, pure functie in `lib/fleet-geometry.ts`:

```
deriveFormation(presetIndex: number, variant: FleetVariant): FormationSlot[]
```

geeft per boot-slot `{ cx, cy, heel }` terug — precies zoveel slots als
`HERO_BOATS`/`AMBIENT_BOATS` lang zijn. `HERO_BOATS`/`AMBIENT_BOATS` blijven ongewijzigd
bestaan als **ankers**: hun `cx`/`cy`/`heel` worden niet meer rechtstreeks als live positie
gelezen (dat doet nu `tcx`/`tcy`/`theel`), maar dienen als uitgangspunt waar
`deriveFormation` omheen varieert. `w`/`depth`/`par` — wat de deeltjesopbouw bepaalt — blijft
wél vast per slot, want die wordt maar één keer bij `buildBoat()` gebruikt; er wordt nooit op
formaat getweend.

De functie leest `PRESETS[presetIndex]` uit `lib/aurora.ts` (met dezelfde val-terug-drift
als `computeFrame` voor presets zonder `drift`, bv. de levende preset) en rekent:

- **Aantal actieve kleine boten** — lineair gemapt vanuit `geo.speed`. `speed` ligt over alle
  presets tussen 0.20 en 0.62; dat bereik wordt lineair geschaald naar `[3, 6]` actieve kleine
  boten voor `hero` (van de 6 kleine ankers) en `[2, 4]` voor `ambient` (van de 4 kleine
  ankers), afgerond op een geheel getal. Welke ankers uit de pool actief zijn wordt geloot met
  een op `presetIndex` + slotindex geseede RNG (`rng()` bestaat al in `fleet-geometry.ts`) —
  dezelfde preset geeft dus altijd exact dezelfde selectie.
- **Grote boot** — `cx`/`cy` schuiven t.o.v. het anker op basis van `geo.scale` en
  `drift.amp`, `heel` op basis van `geo.freq`, met een kleine per-preset jitter uit dezelfde
  geseede RNG. Alles geklemd binnen een bescheiden marge rond het anker, zodat de boot nooit
  over de tekstkolom of buiten het canvas belandt.
- **Niet-actieve kleine boten (en, voor het eerste-mount-doel, elke boot die de preset niet
  kiest)** krijgen als doel een positie buiten beeld, in het verlengde van hun eigen
  boeg-richting: `cx ≈ 1.35`, met **`cy` ongewijzigd op de eigen ankerwaarde**. Zonder die
  laatste voorwaarde zouden meerdere gelijktijdig vertrekkende of aankomende boten door
  hetzelfde punt buiten beeld heen bewegen en elkaars pad kruisen; met een eigen `cy` per boot
  vertrekt en arriveert elke boot langs zijn eigen horizontale lijn.

### Gevolgen voor de bestaande opbouwanimatie

`layout()` berekent vandaag `boat.px`/`py` één keer, uit `boat.cx`/`cy`. Dat verschuift naar
elke frame in `draw()`, uit `boat.tcx`/`tcy` (twee vermenigvuldigingen per boot — verwaarloosbaar
tegenover de honderden deeltjes die toch al per frame langsgaan). `layout()` heeft nog wel een
positie nodig vóór de eerste frame, voor de bestaande scatter-naar-binnen-intro (`p.sx`/`sy`,
uitgerekend uit de boot-positie op het moment van `layout()`) — die berekening leest daarom
voortaan óók `boat.tcx`/`tcy` in plaats van het statische `boat.cx`/`cy` uit de spec. Vandaar
loopt de mount-volgorde
voortaan: `build()` → `setFormation(huidige preset, snap = true)` (zet `tcx = dcx` meteen,
geen tween nodig bij eerste teken) → `layout()` → animatie starten. Een geparkeerde boot bij
het laden begint dus al buiten beeld, zichtbaar noch storend, en komt pas invaren als de
gebruiker een preset kiest die 'm activeert.

### Ambient krijgt een leidende boot

`AMBIENT_BOATS[0].w` gaat omhoog van de huidige kleine maat (~0.11) naar een bescheiden
leidende maat (~0.30) — duidelijk groter dan de overige 4 kleine boten, ruim onder de 0.72
van de hero-boot, zodat `ambient` een rustige achtergrondlaag blijft. `depth` gaat in dezelfde
beweging mee omhoog, van 0.30 naar iets boven de 0.55-drempel die `buildBoat()` gebruikt om
vulpunten toe te voegen naast randpunten (`const d = boat.depth`, getoetst in
`if (shape.fill && d > 0.55)` in `lib/fleet-geometry.ts`); zonder die aanpassing zou de
vergrote boot alleen als omtrek tekenen, niet als volle vorm zoals de hero-boot, en het
"leidende" effect missen. `par` (stuurt alleen muis-parallax, niet de vuldrempel) gaat mee
omhoog naar dezelfde waarde als `depth`, in lijn met hoe elke bestaande `BoatSpec` — hero én
ambient — depth en par al gelijk houdt. `deriveFormation` past voor `ambient` dezelfde logica
toe met 1 leidende + 4 kleine slots in plaats van 1 + 6.

### Frozen, reduced motion, resize

`frozen` (reduced motion of smal scherm) laat `setFormation` altijd met `snap = true` draaien:
`tcx`/`tcy`/`theel` gaan direct op het doel en er wordt één herteken-`draw()` afgedwongen, net
zoals `frozen` nu al de
opbouwanimatie overslaat. Een resize bouwt (zoals nu al) de hele scène opnieuw op; daarbij
snapt elke boot naar de formatie van de op dat moment actieve preset — geen poging om een
lopende tween-voortgang door een volledige herbouw heen te bewaren, want resize herschikt
toch al alles.

## Wat verandert per bestand

- `lib/aurora.ts` — `DEFAULT_DRIFT`-constante geëxporteerd (nu inline in `computeFrame`), zodat
  `deriveFormation` dezelfde val-terug-drift hergebruikt.
- `lib/fleet-geometry.ts` — nieuwe `deriveFormation()` en `FormationSlot`-type;
  `AMBIENT_BOATS[0].w`/`depth`/`par` aangepast; `HERO_BOATS`/`AMBIENT_BOATS` verder
  ongewijzigd (blijven de ankers).
- `lib/use-fleet-scene.ts` — `Boat`-type krijgt `tcx`/`tcy`/`theel`/`dcx`/`dcy`/`dheel`;
  `layout()` levert niet langer de live `px`/`py`, dat verhuist naar `draw()`; nieuwe
  `setFormation(index, snap)` plus het wegzetten ervan in een ref; nieuwe
  `presetIndex`-parameter, een ref die de laatst bekende waarde vasthoudt (voor `onResize`) en
  een kleine losse `useEffect` die beide bijwerkt; `onResize` roept na `build()` ook
  `setFormation(..., snap = true)` aan, vóór `layout()`; mount-volgorde aangepast (zie
  hierboven).
- `components/fleet.tsx` — leest `activePreset` via `useAurora()`, geeft door aan
  `useFleetScene`.

## Buiten scope

- Geen wijziging aan de kleur-blend zelf of aan `AuroraProvider`'s state-model.
- Geen boot-formaat-tween (alleen positie/helling).
- Geen nieuwe presets of wijzigingen aan bestaande preset-kleuren/-geometrie.
- Geen wijziging aan de `journey`-variant uit het losse `/werk/`-scrollverhaal-ontwerp
  (`2026-08-05-werk-scroll-vloot-design.md`) — dat is een apart, nog niet geïmplementeerd stuk
  werk met een eigen vormtaal.
