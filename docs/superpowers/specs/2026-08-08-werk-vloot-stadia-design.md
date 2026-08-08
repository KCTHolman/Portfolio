# Journey-vloot: stadia opschuiven, anker i.p.v. sleutel, nieuw eerste icoon

**Status:** ontwerp, klaar voor implementatieplan
**Branch:** `claude/werk-vloot-stadia` (vanaf de commit "Wapperend zeil, opspattend kielwater
en journey-raketlancering", `2b6efbd`, in een losse worktree — bewust niet vanaf
`claude/firefox-safari-tier-cap`'s huidige stand, die er een ongerelateerde commit bovenop
heeft)

## Doel

De net (nog ongecommitte, op `master`, later verplaatst naar deze branch) toegevoegde
raketlancering aan het eind van de journey-vloot op `/werk` — dezelfde ontsteking/
opstijg-sequentie als de homepage-easter-egg — bleek niet exclusief voor de laatste stap:
de vorm morft nu al geleidelijk tijdens sectie 5 ("Mens beslist") richting raket, dus tegen
de tijd je die sectie hebt uitgelezen lijkt de raket er al te staan. Screenshots van de
live pagina lieten zien dat dit overal in de journey gebeurt, niet alleen bij de raket: bij
"01 · Idee" is het kompas al goed zichtbaar, bij "02 · Routering" al het tandwiel,
enzovoort — elke sectie toont grotendeels de vorm die bij de vólgende sectie hoort, omdat
de vorm binnen één sectie steeds van haar eigen stadium naar het volgende toe getrokken
wordt.

Twee wijzigingen samen lossen dit op:

1. **Alle stadia schuiven één positie op**, met een nieuw eerste stadium (een vouwbootje)
   ervoor. Elke sectie toont daardoor grotendeels de vorm die inhoudelijk bij haarzelf
   past (boot tijdens Idee, kompas tijdens Routering, ...) in plaats van een stap verder.
2. **Sleutel (stadium "Mens beslist") wordt een anker** — zelfde scheeps/mechanisch motief
   als de andere vormen, en een vorm-topologie (ring boven, gehaakte armen onder) die beter
   aansluit bij de raket die erna komt.

## Uitgangspunten uit het gesprek

- Het volstaat dat de **dominante** vorm tijdens het lezen van een sectie inhoudelijk klopt
  — er is expliciet **niet** gekozen voor een garantie dat een vorm al stilstaat zodra de
  tekst in beeld komt (dat zou een eigen "vasthoud"-easing per overgang vereisen, op alle
  zes overgangen in plaats van alleen de raket-overgang). De opschuiving alleen is de
  gekozen, lichtere aanpak.
- Geen wijziging aan `ease()` of aan hoe `journeyT`/`journeyStage` berekend worden in
  `use-fleet-scene.ts` — dat mechanisme blijft ongewijzigd, alleen welke vorm op welke
  positie in `JOURNEY_STAGES` staat verandert.
- De raketlancering zelf (ontsteking, opstijgen, `atRocketStage`-logica) hoeft niet
  aangepast te worden: die reageert al generiek op "laatste stadium bereikt", en dat
  mechanisme (het geforceerde `frac = 1` zodra je de laatste sectie bereikt, in
  `lib/use-journey-progress.ts`) isoleert de raket vanzelf zodra de stadia-array correct
  opschuift.
- Sleutel verdwijnt volledig — geen los "vervang sleutel"-traject naast de opschuiving; dit
  is één samenhangende wijziging.
- Nieuw eerste stadium blijft in dezelfde scheepsfamilie als de rest (overwogen en
  afgewezen: een envelop — sluit aan bij de "inbox"-copy van sectie 1, maar is het enige
  kantoor-object in een verder nautisch/mechanisch rijtje; en een abstracte vonk — te
  vlak). Gekozen: een vouwbootje, het idee in zijn ruwste vorm, dat tijdens sectie 1
  uitgroeit tot de volledig getuigde boot.

## Wat er al staat

`lib/fleet-geometry.ts` exporteert `JOURNEY_STAGES: JourneyStage[]`, waar `JourneyStage =
Point[][]` telkens acht polygonen is in dezelfde volgorde als de boot se acht rollen (hull,
mainsail, jib, flyer, mast, boom, sprit, flag — zie `JOURNEY_SLOTS`/`SHAPES`), elk met een
vast edge-/fill-puntenbudget. Vandaag:

```ts
export const JOURNEY_STAGES: JourneyStage[] = [
  BOAT_STAGE,
  COMPASS_STAGE,
  GEAR_STAGE,
  SHIELD_STAGE,
  KEY_STAGE,
  ROCKET_STAGE,
]
export const JOURNEY_STAGE_COUNT = JOURNEY_STAGES.length // 6
```

`components/werk/werk-journey.tsx` definieert `SECTION_IDS = ['idee', 'routering',
'bouwen', 'checks', 'mens', 'live']` (ook 6, index voor index gekoppeld aan
`JOURNEY_STAGES`) en leest via `useJourneyProgress(SECTION_IDS)` een `progressRef` uit.

`lib/use-journey-progress.ts` zet `progressRef.current = i + frac`, waarbij `i` de index is
van de laatste sectie waarvan de bovenkant de midden-lijn van het scherm is gepasseerd, en
`frac` de voortgang (0..1) tussen die sectie en de volgende — behalve bij de láátste sectie
(`live`), waar `frac` altijd hard op `1` staat zodra `i` de laatste index is.

`lib/use-fleet-scene.ts` leest dat om naar:

```ts
const journeyStage = Math.floor(clampedProgress)   // huidig stadium
const journeyNext = journeyStage + 1               // waar het stadium naartoe tweent
const journeyT = ease(clampedProgress - journeyStage)
```

Gedurende de hele tijd dat sectie `i` actief is (dus zolang je die sectie leest, van het
moment dat haar top de middenlijn passeert tot het moment dat de volgende sectie dat doet)
loopt de vorm continu van `JOURNEY_STAGES[i]` naar `JOURNEY_STAGES[i + 1]` — bij de laatste
sectie is er geen tussenliggende tween: `frac` staat daar meteen op `1`, dus die vorm staat
in één keer volledig. Dat laatste mechanisme bestond al vóór dit ontwerp (het is niet nieuw
toegevoegd voor de raket) en blijft ongewijzigd.

**Vier** plekken in `use-fleet-scene.ts` verwijzen naar **absolute** stadium-indices in
plaats van relatief aan `JOURNEY_STAGE_COUNT`, en moeten daarom expliciet meeschuiven — dit
zijn vier losse plekken, niet één:

- Regel ~235, `initialJourneyStage`: `variant === 'home-compass' ? 1 : variant ===
  'home-gear' ? 2 : ...`. Wordt precies één keer gebruikt (regel ~994-995), om de
  begin-positie van de entry-scatter-animatie te zetten vóórdat de vorm voor het eerst
  "aankomt" — heeft geen invloed op wat er in latere frames getekend wordt.
- Regel ~1256-1264, de `rawProgress`-toewijzing: dezelfde `'home-compass' ? 1 :
  'home-gear' ? 2 : ...`-keten, maar dan als bron van `clampedProgress` →
  `journeyStage`/`journeyNext`, wat élk frame bepaalt welk stadium daadwerkelijk getekend
  wordt. **Dit is de belangrijkste van de vier** — zonder deze fix blijft de
  homepage-scène "kompas" permanent `journeyStage 1` (na de opschuiving: de boot) tonen in
  plaats van het kompas, ongeacht de fix aan `initialJourneyStage`.
- Regel ~1277: `const compassStageIndex = 1` — bepaalt wanneer de kompasnaald los van de
  kast mag schommelen (zie `NEEDLE_SLOTS`).
- Regel ~1295: `const boatWeight = journeyLike ? (journeyStage === 0 ? 1 - journeyT : 0) :
  1` — hardcodeert stadium 0 als "dit is de boot". Stuurt twee lopende effecten voor de
  `journey`-variant: het wapperende zeil (`sailFlutter`, regel ~1296, gebruikt op regel
  ~1645/~1756) en het uitdoven van het kielwater bij het weglopen van de boot (regel
  ~1906, `r *= boatWeight`). Na de opschuiving is de boot stadium 1, niet 0 — zonder deze
  fix wapperen de zeilen (en dooft het kielwater) op het vouwbootje in plaats van op de
  echte, getuigde boot.

Alle vier moeten aangepast: de eerste drie van `1`/`2` naar `2`/`3` (kompas en tandwiel
schuiven ieder één positie op), `boatWeight`'s `journeyStage === 0` wordt
`journeyStage === 1` (de boot schuift van stadium 0 naar stadium 1).

Alle ándere verwijzingen (`atRocketStage`, `rocketIndex`, `stageIdx`) zijn al relatief
(`JOURNEY_STAGE_COUNT - 1`) en volgen het laatste stadium automatisch, wat het ook is.

`SHOWCASE_STAGES` (`fleet-geometry.ts`, voor de vloot-showcase op `/koen-holman/`) is een
eigen array die rechtstreeks naar de vorm-constanten verwijst (`[BOAT_STAGE, COMPASS_STAGE,
ROCKET_STAGE, GEAR_STAGE]`), niet naar posities in `JOURNEY_STAGES` — die blijft dus
ongewijzigd, net als `NEEDLE_SLOTS`/`SAIL_SLOTS` (rolnummers 0-7 binnen één vorm, geen
stadium-indices).

## Architectuur

### 1. Twee nieuwe stadia, in het bestaande 8-slot patroon

**`ANCHOR_STAGE`** vervangt `KEY_STAGE` (en de losse `KEY_BOW`-constante, die verdwijnt).
Zelfde acht rollen, ingevuld als anker in plaats van sleutel:

- hull-rol: de ring (gevulde cirkel, zelfde constructie als sleutel se baard/`circlePoly`).
- mainsail-/jib-rol: de twee gehaakte vloeken (linker/rechter arm) — bewust hetzelfde
  slotpaar als `ROCKET_STAGE`'s linker-/rechtervin, voor een consistente
  deeltjes-toewijzing tussen de twee opeenvolgende stadia.
- flyer-rol: de schacht (gevulde balk).
- mast-/boom-/sprit-rol: stok/kruisbalk en schachtrand-accenten (dunne lijnen, zelfde
  aanpak als de bestaande schachtranden bij sleutel en de accentlijn bij schild).
- flag-rol: klein accent (bv. een moerpuntje op de ring), zelfde schaal als de bestaande
  klinknagel/sleutelgat-accenten.

**`PAPERBOAT_STAGE`** is het nieuwe eerste stadium. Ook acht rollen, maar eenvoudiger dan de
volledige boot (geen apart giek-/kluiver-detail nodig) — een plat gevouwen bootje,
opgebouwd met de bestaande `poly`/`spar`-helpers, in hetzelfde genormaliseerde vak (x: 0–1,
y: 0–~0.96) als alle andere stadia.

Exacte puntcoördinaten voor beide vormen zijn iteratief te bepalen in de browser (zelfde
aanpak als de eerdere vijf stadia) — dit ontwerp legt de rolverdeling en het motief vast,
niet de precieze polygonen.

### 2. `JOURNEY_STAGES` herordenen

```ts
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

7 stadia in plaats van 6. `JOURNEY_STAGE_COUNT` (`.length`) telt automatisch mee, dus elke
bestaande `JOURNEY_STAGE_COUNT - 1`-relatieve verwijzing wijst na deze wijziging vanzelf
naar het nieuwe laatste stadium (index 6, raket) — daar is geen aparte aanpassing voor
nodig.

### 3. De vier absolute indices meeschuiven

- Regel ~235 (`initialJourneyStage`): `'home-compass' ? 1 : 'home-gear' ? 2` →
  `'home-compass' ? 2 : 'home-gear' ? 3`.
- Regel ~1256-1264 (de `rawProgress`-toewijzing, zelfde ternary-keten, los van regel ~235):
  ook `'home-compass' ? 1 : 'home-gear' ? 2` → `'home-compass' ? 2 : 'home-gear' ? 3`. Dit
  is de belangrijkste van de vier — deze stuurt `journeyStage` elk frame, dus zonder deze
  fix blijft de homepage-scène "kompas" na de opschuiving de boot tonen, ook als regel
  ~235 wel is aangepast.
- Regel ~1277: `compassStageIndex = 1` → `compassStageIndex = 2`.
- Regel ~1295: `boatWeight`'s `journeyStage === 0` → `journeyStage === 1` (stuurt het
  wapperende zeil en het uitdoven van het kielwater — die moeten bij de echte boot horen,
  niet bij het nieuwe vouwbootje-stadium).

Zonder alle vier deze fixes toont de homepage-scène "kompas" straks de boot, schommelt de
kompasnaald-logica op het verkeerde stadium, en wapperen zeil/kielwater op het vouwbootje
in plaats van op de boot.

## Wat verandert per bestand

- `lib/fleet-geometry.ts` — nieuwe `PAPERBOAT_STAGE` en `ANCHOR_STAGE`, `KEY_STAGE`/
  `KEY_BOW` verwijderd, `JOURNEY_STAGES` herordend naar zeven stadia.
- `lib/use-fleet-scene.ts` — vier hardgecodeerde stadium-indices (regel ~235, ~1256-1264,
  ~1277, ~1295) aangepast aan de nieuwe posities van kompas/tandwiel/boot.

## Buiten scope

- Geen "vasthoud"-easing per overgang (bewust afgewezen als te zwaar, zie Uitgangspunten) —
  de opschuiving alleen is de gekozen aanpak.
- Geen wijziging aan de showcase-vloot (`/koen-holman/`) of aan `SHOWCASE_STAGES` — die
  verwijst rechtstreeks naar vorm-constanten, niet naar `JOURNEY_STAGES`-posities.
- Geen wijziging aan de al bestaande launch-/zeil-flutter-/kielwater-logica in
  `use-fleet-scene.ts` — die reageert al generiek op het laatste stadium.
- Geen nieuwe tekst/content op de zes secties zelf — dit ontwerp raakt uitsluitend de
  vloot-animatie.
