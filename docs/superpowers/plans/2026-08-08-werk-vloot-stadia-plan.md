# Journey-vloot-stadia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg een nieuw eerste journey-stadium (vouwbootje) toe, vervang het sleutel-stadium
door een anker, en schuif alle stadia één positie op zodat elke sectie op `/werk` grotendeels
de vorm toont die inhoudelijk bij haarzelf past in plaats van bij de volgende sectie.

**Architecture:** `JOURNEY_STAGES` in `lib/fleet-geometry.ts` groeit van 6 naar 7 stadia
(`[PAPERBOAT_STAGE, BOAT_STAGE, COMPASS_STAGE, GEAR_STAGE, SHIELD_STAGE, ANCHOR_STAGE,
ROCKET_STAGE]`), beide nieuwe vormen volgen het bestaande acht-slot-patroon (hull/mainsail/
jib/flyer/mast/boom/sprit/flag). Vier plekken in `lib/use-fleet-scene.ts` verwijzen naar
absolute stadium-posities in plaats van relatief aan `JOURNEY_STAGE_COUNT` en moeten
daardoor expliciet meeschuiven.

**Tech Stack:** Next.js App Router, React 19, TypeScript, canvas-tekenwerk in
`lib/use-fleet-scene.ts`/`lib/fleet-geometry.ts` — geen testframework in deze repo
(`package.json` heeft alleen `typecheck` via `tsc --noEmit`). Verificatie per taak is dus:
`npm run typecheck` + visuele controle in de browser, niet een test-suite.

## Global Constraints

- Geen wijziging aan `ease()` of aan hoe `journeyT`/`journeyStage`/`journeyNext` berekend
  worden — alleen welke vorm op welke positie in `JOURNEY_STAGES` staat verandert.
- De raketlancering, het wapperende zeil en het kielwater (recent toegevoegd, commit
  `2b6efbd`) blijven functioneel ongewijzigd — ze reageren al generiek op stadium-posities
  via `JOURNEY_STAGE_COUNT`-relatieve logica (met de uitzondering van `boatWeight`, zie
  Taak 2).
- Geen aanpassing aan `SHOWCASE_STAGES`/`SHOWCASE_VLOOT_STAGE`/`SHOWCASE_COMPASS_STAGE`/
  `SHOWCASE_ROCKET_STAGE`/`SHOWCASE_GEAR_STAGE` — die verwijzen rechtstreeks naar
  vorm-constanten (`BOAT_STAGE`, `COMPASS_STAGE`, ...), niet naar posities in
  `JOURNEY_STAGES`, en blijven dus ongewijzigd werken.
- Geen aanpassing aan `NEEDLE_SLOTS`/`SAIL_SLOTS` — dat zijn rolnummers (0-7) binnen één
  vorm, geen stadium-indices.
- Exacte puntcoördinaten voor `PAPERBOAT_STAGE`/`ANCHOR_STAGE` zijn een startpunt, niet
  heilig — fijnslijpen in de browser tijdens de visuele controle mag, zolang de acht-rollen-
  indeling (welk onderdeel welke rol/slot krijgt) intact blijft.

---

### Task 1: Nieuwe vormen — `PAPERBOAT_STAGE` en `ANCHOR_STAGE`

**Files:**
- Modify: `lib/fleet-geometry.ts`

**Interfaces:**
- Produces: `PAPERBOAT_STAGE: JourneyStage` en `ANCHOR_STAGE: JourneyStage` (module-lokale
  consts, niet geëxporteerd — zelfde zichtbaarheid als `BOAT_STAGE`/`COMPASS_STAGE`/etc.).
  `JOURNEY_STAGES: JourneyStage[]` (al geëxporteerd) krijgt 7 entries in plaats van 6.
- Consumes: niets van andere taken — dit is de fundering. `KEY_STAGE`/`KEY_BOW` verdwijnen
  (geverifieerd: nergens anders in de repo gebruikt dan in hun eigen definitie en de
  `JOURNEY_STAGES`-array).

- [ ] **Step 1: `PAPERBOAT_STAGE` toevoegen, vóór `BOAT_STAGE`**

In `lib/fleet-geometry.ts`, vervang:

```ts
/** De boot als journey-stadium 0 — dezelfde acht polygonen als hierboven,
 *  hier alleen herverpakt in het vormonafhankelijke formaat. */
const BOAT_STAGE: JourneyStage = SHAPES.map((s) => s.pts)
```

door:

```ts
/* Vouwbootje: het idee in zijn ruwste vorm, nog geen getuigde boot — een plat
   gevouwen scheepje met twee zeil-vouwen en een paar plooilijnen. Journey-
   stadium 0, groeit tijdens sectie "01 · Idee" uit tot BOAT_STAGE hieronder. */
const PAPERBOAT_STAGE: JourneyStage = [
  poly([0.14, 0.72], [0.86, 0.72], [0.68, 0.86], [0.32, 0.86]), // romp (hull-rol)
  poly([0.46, 0.72], [0.46, 0.16], [0.74, 0.52]), // voorste zeil-vouw (mainsail-rol)
  poly([0.46, 0.16], [0.28, 0.52], [0.46, 0.52]), // achterste zeil-vouw (jib-rol)
  poly([0.86, 0.72], [0.94, 0.72], [0.86, 0.78]), // boegvouw (flyer-rol)
  spar([0.46, 0.16], [0.46, 0.72], 0.006), // vouwlijn mast (mast-rol)
  spar([0.14, 0.72], [0.46, 0.72], 0.005), // dekvouw links (boom-rol)
  spar([0.46, 0.72], [0.86, 0.72], 0.005), // dekvouw rechts (sprit-rol)
  poly([0.14, 0.72], [0.20, 0.72], [0.14, 0.78]), // stevenvouw (flag-rol)
]

/** De boot als journey-stadium 1 — dezelfde acht polygonen als hierboven,
 *  hier alleen herverpakt in het vormonafhankelijke formaat. */
const BOAT_STAGE: JourneyStage = SHAPES.map((s) => s.pts)
```

- [ ] **Step 2: `KEY_STAGE`/`KEY_BOW` vervangen door `ANCHOR_STAGE`**

Vervang:

```ts
/* Sleutel: baard links, schacht, en de tanden rechts — horizontaal, net als
   de boot een duidelijke richting heeft. */
const KEY_BOW: Point = [0.22, 0.46]
const KEY_STAGE: JourneyStage = [
  circlePoly(KEY_BOW[0], KEY_BOW[1], 0.16, 0.16, 36), // baard (hull-rol)
  spar([0.34, 0.46], [0.8, 0.46], 0.045), // schacht (mainsail-rol)
  poly([0.8, 0.4], [0.92, 0.4], [0.92, 0.5], [0.86, 0.5], [0.86, 0.58], [0.8, 0.58]), // tanden (jib-rol)
  circlePoly(KEY_BOW[0], KEY_BOW[1], 0.09, 0.09, 26), // opening in de baard (flyer-rol)
  spar([0.72, 0.46], [0.72, 0.58], 0.006), // extra tand (mast-rol)
  spar([0.36, 0.4], [0.78, 0.4], 0.005), // schachtrand (boom-rol)
  spar([0.36, 0.52], [0.78, 0.52], 0.005), // schachtrand (sprit-rol)
  poly([0.205, 0.44], [0.235, 0.44], [0.235, 0.47], [0.22, 0.5], [0.205, 0.47]), // sleutelgat-accent (flag-rol)
]
```

door:

```ts
/* Anker: ring boven, schacht, en twee gehaakte vloeken onder. De vloeken
   staan bewust op dezelfde rollen (mainsail-/jib-rol) als de twee vinnen van
   ROCKET_STAGE hieronder — zelfde slotpaar, voor een rustige deeltjes-
   overgang naar de raket die hierna komt. */
const ANCHOR_RING: Point = [0.5, 0.16]
const ANCHOR_CROWN: Point = [0.5, 0.62]
const ANCHOR_STAGE: JourneyStage = [
  circlePoly(ANCHOR_RING[0], ANCHOR_RING[1], 0.09, 0.09, 32), // ring (hull-rol)
  poly(ANCHOR_CROWN, [0.22, 0.80], [0.34, 0.86], [0.42, 0.70]), // linkervloek (mainsail-rol)
  poly(ANCHOR_CROWN, [0.78, 0.80], [0.66, 0.86], [0.58, 0.70]), // rechtervloek (jib-rol)
  spar([0.5, 0.24], [0.5, 0.62], 0.045), // schacht (flyer-rol)
  spar([0.34, 0.28], [0.66, 0.28], 0.028), // stok (mast-rol)
  spar([0.44, 0.24], [0.44, 0.60], 0.005), // schachtrand (boom-rol)
  spar([0.56, 0.24], [0.56, 0.60], 0.005), // schachtrand (sprit-rol)
  poly([0.485, 0.13], [0.515, 0.13], [0.515, 0.16], [0.485, 0.16]), // moerpuntje (flag-rol)
]
```

- [ ] **Step 3: `JOURNEY_STAGES` herordenen**

Vervang:

```ts
/** Geordend: elk journey-stadium van boot tot raket. */
export const JOURNEY_STAGES: JourneyStage[] = [
  BOAT_STAGE,
  COMPASS_STAGE,
  GEAR_STAGE,
  SHIELD_STAGE,
  KEY_STAGE,
  ROCKET_STAGE,
]
```

door:

```ts
/** Geordend: elk journey-stadium van vouwbootje tot raket. */
export const JOURNEY_STAGES: JourneyStage[] = [
  PAPERBOAT_STAGE,
  BOAT_STAGE,
  COMPASS_STAGE,
  GEAR_STAGE,
  SHIELD_STAGE,
  ANCHOR_STAGE,
  ROCKET_STAGE,
]
```

`JOURNEY_STAGE_COUNT = JOURNEY_STAGES.length` erna telt automatisch mee naar 7 — die regel
blijft ongewijzigd.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: geen errors. Met name geen "unused variable"/"cannot find name" op `KEY_STAGE`/
`KEY_BOW` (volledig verwijderd, geen resten) en geen type-mismatch op `PAPERBOAT_STAGE`/
`ANCHOR_STAGE` (moeten allebei `JourneyStage = Point[][]` zijn, acht entries).

- [ ] **Step 5: Visuele verificatie in de browser**

Start de dev server en open `/werk`. Zet de diepte-schuif desnoods op "Overzicht" (default
is genoeg, de vloot-animatie is onafhankelijk van die schuif). Scroll van boven naar onder
en controleer:

- Bij het laden van de pagina (boven "01 · Idee") staat er een plat, eenvoudig gevouwen
  bootje met twee zeil-vouwen — geen volledig getuigde boot.
- Scrollend door "01 · Idee" groeit dat vouwbootje uit tot de volledig getuigde
  zeilboot (mast, grootzeil, fok, kluiver) tegen de tijd dat "02 · Routering" in beeld komt.
- De rest van de overgangen (boot→kompas→tandwiel→schild→anker→raket) ziet er ongewijzigd
  uit qua vloeiendheid — bij "05 · Mens beslist" vormt zich nu een anker (ring, schacht,
  twee haken) in plaats van een sleutel, en bij "06 · Live" nog steeds de raketlancering.
- **Verwacht, nog niet gefixt (komt in Taak 2):** het wapperende zeil-effect en het
  oplichtende kielwater onder de romp zitten nu op het vouwbootje-stadium in plaats van op
  de echte boot — dat is een bekende tussentijdse afwijking, niet een nieuwe bug om hier op
  te lossen.

- [ ] **Step 6: Commit**

```bash
git add lib/fleet-geometry.ts
git commit -m "Voeg vouwbootje- en ankerstadium toe, schuif JOURNEY_STAGES op"
```

---

### Task 2: Vier hardgecodeerde stadium-indices in `use-fleet-scene.ts` meeschuiven

**Files:**
- Modify: `lib/use-fleet-scene.ts`

**Interfaces:**
- Consumes: de nieuwe, zeven-stadia-lange `JOURNEY_STAGES`/`JOURNEY_STAGE_COUNT` uit
  Taak 1 — dit is precies wat deze taak corrigeert. Vóór Taak 1 is deze taak niet
  uitvoerbaar (de nieuwe posities `2`/`3` zouden dan naar de verkeerde vormen wijzen).
- Produces: niets voor latere taken — dit is de laatste taak van het plan.

- [ ] **Step 1: `initialJourneyStage` en de bijbehorende toelichting**

Vervang:

```ts
    /** Alleen relevant voor journeyLike: welk stadium hoort bij de allereerste
     *  tekenbeurt van déze variant. journey start altijd bij de boot (scroll
     *  begint boven), maar de drie homepage-scènes staan meteen op hun eigen,
     *  vaste stadium (zie de rawProgress-toewijzing in draw()) — entryPos()
     *  moet daarom vanaf de JUISTE vorm beginnen, niet altijd vanaf de boot,
     *  anders oogt het laden als "boot verandert na een paar tellen in een
     *  kompas/tandwiel", in plaats van die vorm die zelf scherp wordt. Zelfde
     *  indices als de rawProgress-toewijzing in draw() hieronder (kompas 1,
     *  tandwiel 2, raket het laatste stadium) — JOURNEY_STAGES' eigen
     *  volgorde, niet showcase's afwijkende SHOWCASE_STAGES-volgorde. */
    const initialJourneyStage =
      variant === 'home-compass' ? 1 : variant === 'home-gear' ? 2 : variant === 'home-rocket' ? JOURNEY_STAGE_COUNT - 1 : 0
```

door:

```ts
    /** Alleen relevant voor journeyLike: welk stadium hoort bij de allereerste
     *  tekenbeurt van déze variant. journey start altijd bij het vouwbootje
     *  (scroll begint boven), maar de drie homepage-scènes staan meteen op hun
     *  eigen, vaste stadium (zie de rawProgress-toewijzing in draw()) —
     *  entryPos() moet daarom vanaf de JUISTE vorm beginnen, niet altijd vanaf
     *  het vouwbootje, anders oogt het laden als "vouwbootje verandert na een
     *  paar tellen in een kompas/tandwiel", in plaats van die vorm die zelf
     *  scherp wordt. Zelfde indices als de rawProgress-toewijzing in draw()
     *  hieronder (kompas 2, tandwiel 3, raket het laatste stadium) —
     *  JOURNEY_STAGES' eigen volgorde, niet showcase's afwijkende
     *  SHOWCASE_STAGES-volgorde. */
    const initialJourneyStage =
      variant === 'home-compass' ? 2 : variant === 'home-gear' ? 3 : variant === 'home-rocket' ? JOURNEY_STAGE_COUNT - 1 : 0
```

- [ ] **Step 2: De `rawProgress`-toewijzing**

Vervang:

```ts
      const rawProgress =
        variant === 'journey'
          ? (progressRef?.current ?? 0)
          : variant === 'home-compass'
            ? 1
            : variant === 'home-gear'
              ? 2
              : variant === 'home-rocket'
                ? JOURNEY_STAGE_COUNT - 1
                : 0
```

door:

```ts
      const rawProgress =
        variant === 'journey'
          ? (progressRef?.current ?? 0)
          : variant === 'home-compass'
            ? 2
            : variant === 'home-gear'
              ? 3
              : variant === 'home-rocket'
                ? JOURNEY_STAGE_COUNT - 1
                : 0
```

- [ ] **Step 3: `compassStageIndex`**

Vervang:

```ts
      const compassStageIndex = 1
```

door:

```ts
      const compassStageIndex = 2
```

- [ ] **Step 4: `boatWeight`**

Vervang:

```ts
      /* Hoe "boot" het huidige beeld is — 1 op de boot zelf, aflopend naar 0
         zodra de morph naar het kompas vertrekt. Hero/ambient tonen nooit
         iets anders dan een boot, dus die krijgen 'm altijd op 1; de
         homepage-scènes (home-compass/-gear/-rocket) staan altijd op hun
         eigen stadium en dus altijd op 0. */
      const boatWeight = journeyLike ? (journeyStage === 0 ? 1 - journeyT : 0) : 1
```

door:

```ts
      /* Hoe "boot" het huidige beeld is — 1 op de boot zelf, aflopend naar 0
         zodra de morph naar het kompas vertrekt. Hero/ambient tonen nooit
         iets anders dan een boot, dus die krijgen 'm altijd op 1; de
         homepage-scènes (home-compass/-gear/-rocket) staan altijd op hun
         eigen stadium en dus altijd op 0. Stadium 1, niet 0 — stadium 0 is nu
         het vouwbootje (zie PAPERBOAT_STAGE in fleet-geometry.ts). */
      const boatWeight = journeyLike ? (journeyStage === 1 ? 1 - journeyT : 0) : 1
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: geen errors — dit zijn pure literal-wijzigingen, geen type-impact verwacht.

- [ ] **Step 6: Visuele verificatie in de browser**

Open `/werk` opnieuw en scroll door de hele journey:

- Het wapperende zeil-effect en het oplichtende kielwater zitten nu op de echte, getuigde
  boot (zichtbaar tegen het eind van "01 · Idee" en tijdens "02 · Routering", aflopend naar
  niets zodra de vorm richting kompas vertrekt) — niet meer op het vouwbootje. Dit is de fix
  van de bekende afwijking uit Taak 1.

Open de homepage (`/`) en forceer elk van de drie scènes via devtools (Console):

```js
sessionStorage.setItem('kh-home-scene', 'compass'); location.reload()
```

Controleer: de scène toont een volledig gevormd **kompas** (kast, naald, windroos), niet de
boot.

```js
sessionStorage.setItem('kh-home-scene', 'gear'); location.reload()
```

Controleer: de scène toont een volledig gevormd **tandwiel** (lichaam, tandrand, spaken),
niet het kompas, en de rotatie-animatie (zie `variant === 'home-gear'` elders in het
bestand) draait nog steeds.

```js
sessionStorage.setItem('kh-home-scene', 'rocket'); location.reload()
```

Controleer: de scène toont nog steeds de bekende raketlancering-cyclus (ontsteking,
opstijgen, verdwijnen, opnieuw vormen) — deze scène was al op het laatste stadium
gehardcodeerd (`JOURNEY_STAGE_COUNT - 1`) en dat blijft kloppen, ongeacht de opschuiving.

Ruim op na het testen:

```js
sessionStorage.removeItem('kh-home-scene')
```

- [ ] **Step 7: Commit**

```bash
git add lib/use-fleet-scene.ts
git commit -m "Schuif vier hardgecodeerde stadium-indices mee (kompas/tandwiel/boot)"
```
