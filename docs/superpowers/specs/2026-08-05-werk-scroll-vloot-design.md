# /werk/ als scrollverhaal: vloot die morft naar raket

**Status:** ontwerp, klaar voor implementatieplan
**Branch:** `claude/werk-scroll-vloot` (vers vanaf `master`, ná de Next.js-migratie)

## Doel

`/werk/` vertelt nu deSchouwVloot via een keuzescherm (verhalend / technisch / README) met
een apart logboek-verhaal (12 stappen, typewriter-stijl) op `/werk/logboek/`. Dat wordt
vervangen door één doorlopend, scrollbaar verhaal op `/werk/` zelf: geen keuzescherm, geen
typewriter-log, maar een logische lijn van idee tot lancering. Elke sectie heeft één heldere
kernzin (moet een leek verbazen) met optionele diepgang (moet een techneut nieuwsgierig maken
en kunnen verifiëren).

Terwijl je scrolt vervormt de bestaande deeltjes-vloot (`components/fleet.tsx`) rechts in
beeld — dezelfde puntenwolk die nu de zeilboot tekent — naar een reeks andere vormen, en
eindigt met een lancering zodra je bij "live" aankomt.

## Uitgangspunten uit het gesprek

- Geen verhalende toon ("ik typ een issue..."); wel kernstappen, systemisch geformuleerd.
- Eén heldere laag per sectie + optionele, inklapbare diepgang (bestaande `dsv-entry-tech`/
  `dsv-entry-fail`-stijl content, hergebruikt uit `run-data.tsx`).
- Expliciet benoemen: waarom de volle Claude-CLI op een self-hosted runner de beste ervaring
  geeft, in plaats van een kant-en-klare Claude GitHub Action-stap (volle agent-toegang +
  eigen concurrency/budget/lane-regels i.p.v. de Action-sandbox).
- Expliciet benoemen: precies drie soorten plekken waar een mens moet klikken (merge, release,
  escalatie/`needs-human`) — geen vaag "af en toe".
- De koffie-demo (`components/demo/*`) blijft, losgekoppeld van een stappenverhaal, als
  tastbaar bewijsstuk ná de lancering.
- `/werk/logboek/` wordt herbouwd (geen eigen route meer met dit stappenverhaal); de inhoud
  verhuist naar `/werk/`. `/werk/readme/` blijft ongewijzigd staan als diepste laag.
- De animatie hoort rechts, vast in beeld (`position: fixed`, zoals nu al op de homepage en
  als `ambient`-vloot), niet een kolom die meescrollt.
- Het "morphen" moet voelen als vervorming, niet als een cut: deeltjes komen niet gelijk aan
  op hun nieuwe positie.

## Contentstructuur: zes secties

Elke sectie mapt op een vorm (zie hieronder) en hergebruikt/comprimeert bestaande copy uit
`components/showcase/run-data.tsx` en `technisch-data.tsx` in plaats van nieuwe teksten te
verzinnen.

1. **Idee** (vorm: boot/anker) — kernzin: een los idee, geen vast format nodig.
   Bron: `RUN_STEPS[0]` ("Idee in de inbox").
2. **Routering** (kompas) — kernzin: vindt zelf het juiste project, ook al bedient
   deSchouwVloot er meerdere. Bron: `RUN_STEPS[1]` ("Naar het juiste project").
3. **Triage → plan → bouwen** (tandwiel) — kernzin: de agent werkt het zelf uit.
   Bron: comprimeer `RUN_STEPS[2..7]` (triage, plan-langs-kompas, kop-is-geen-maat,
   aanhaken-op-bestaand, epic, build) tot drie deelstappen. Hier ook de callout over de
   Claude-CLI-koppeling (nieuwe copy, geen bestaande bron — technisch correct te schrijven
   op basis van wat al in `RUN_STEPS[7].tech` staat over de self-hosted lane).
4. **Checks** (schild) — kernzin: zes bewakingen moeten groen zijn.
   Bron: `RUN_STEPS[8]` ("Werkt de rest nog?") + volledige `CHECKS`-lijst en `METRICS`-lijst
   uit `technisch-data.tsx`, hergebruikt zonder herschrijven.
5. **Mens beslist** (sleutel) — kernzin: precies drie soorten plekken waar jij klikt.
   Bron: `RUN_STEPS[9]` (Merge) + `RUN_STEPS[10]` (Release) + het weerkerende
   `needs-human`-escalatiepatroon dat nu al in meerdere `fail`-teksten staat, hier voor het
   eerst als eigen, benoemd derde gat.
6. **Live** (raket, lancering) — kernzin + lift-off-animatie.
   Bron: `RUN_STEPS[11]` ("Live"). Direct eronder: `DemoPanel`/`DemoSheet` uit
   `components/demo/*`, ongewijzigd hergebruikt, als los "probeer het zelf"-blok — niet als
   sluitstuk van een verhaal maar als bewijs.

`ROADMAP` (vandaag/morgen) verhuist als extra diepgang bij sectie 3 of 4; geen eigen sectie.

## De animatie: uitbreiding van het bestaande deeltjessysteem

### Wat er al staat

`lib/fleet-geometry.ts` definieert de zeilboot als een set genormaliseerde vormen (`HULL`,
`MAINSAIL`, `JIB`, `FLYER`, `MAST`, `BOOM`, `SPRIT`, `FLAG`), elk met `edge`/`fill`-dichtheid
en een kleurbias. `buildBoat()` verspreidt daar honderden `Particle`s overheen (rand +
vlakvulling). `lib/use-fleet-scene.ts` tekent die deeltjes op canvas, en laat ze bij het laden
"aankomen" vanaf een verspreide startpositie naar hun plek in de boot — elk deeltje met een
eigen `lag` uit `SETTLE`-bakjes, zodat de vorm zich als een golf opbouwt, niet als een klik.
`components/fleet.tsx` rendert het mountpunt met twee bestaande varianten (`hero` op de
homepage, `ambient` als achtergrondlaag elders) en regelt `frozen` (reduced motion / smal
scherm) en de fade-in.

### Wat erbij komt

- **Nieuwe vormensets** in `fleet-geometry.ts`, in dezelfde `poly`/`curve`/`spar`-taal als de
  boot: kompas, tandwiel, schild, sleutel, raket. Genormaliseerd in hetzelfde vak (x: 0–1,
  y: 0–~0.96) zodat ze zonder herschalen tegen elkaar over te vloeien zijn.
- **Een derde `FleetVariant`** (werknaam `journey`) die, in plaats van één vaste `SHAPES`-set,
  een `progress`-waarde (0–1) aanneemt en per deeltje interpoleert tussen de bronvorm en de
  doelvorm horende bij de huidige en volgende sectie. Deeltjesaantal en -toewijzing blijven
  vast (zelfde particle-index hoort bij hetzelfde punt in beide vormen, zodat er niets
  opnieuw opgebouwd hoeft te worden bij een overgang) — de `ux`/`uy`-doelpositie van elk
  deeltje wordt een `lerp` tussen shape A en shape B in plaats van een vaste waarde.
- **Vervorming, geen cut**: elk deeltje behoudt zijn eigen `lag`/`jitter` uit het bestaande
  systeem, toegepast op de overgang tussen vormen in plaats van (of naast) de opbouw bij het
  laden. Zo ontstaat er middenin een overgang een tijdelijk vervormde, "kokende" wolk die
  noch boot, noch kompas is — dat is het effect dat om is gevraagd.
- **`progress` komt uit scroll**: een `IntersectionObserver` (of scroll-fractie, uit te werken
  in het implementatieplan) over de zes secties in `/werk/page.tsx` zet welke twee vormen
  actief zijn en hoever de overgang gevorderd is. Geen library, vanilla zoals de rest van het
  systeem.
- **Lift-off bij "live"**: zodra de raketvorm volledig gevormd is, krijgen de deeltjes een
  opwaartse versnelling + uitdoving (vergelijkbaar met de bestaande losse-stof-drift die nu al
  `vx` heeft — hier komt er een `vy`-fase bij) zodat de vloot letterlijk opstijgt en verdwijnt.
  Geen nieuwe scroll nodig om dit te zien; het is het sluitstuk van sectie 6.

### Positionering

Blijft `position: fixed; inset: 0` (zie `app/styles/fleet.css`), net als `hero`/`ambient` nu
— het canvas beweegt niet mee met de scroll, het staat vast terwijl de inhoud eronder scrollt.
De vorm zelf blijft rechts gepositioneerd via `cx`-fracties in de nieuwe `BoatSpec`-achtige
specs (zoals `HERO_BOATS`/`AMBIENT_BOATS` nu al rechts leggen), niet via een CSS-grid-kolom —
dat is ook hoe de homepage het al doet (`.kh-home-grid` is puur `display:block`; de illusie
van "tekst links, vloot rechts" komt van de tekstkolom die stopt bij 600px naast een
schermvullende canvaslaag).

### Performance/toegankelijkheid

Zelfde regels als het bestaande systeem, niet opnieuw uitvinden:
`prefers-reduced-motion` en het smal-scherm-breekpunt zetten `frozen` → één statische,
volledig gevormde stand per sectie in plaats van een lopende morph (zoals `frozen` nu al
de opbouw-animatie overslaat). Op mobiel is de vloot sowieso terugtredend/lager-opaciteit,
zoals nu al in `fleet.css`.

## Wat verdwijnt / verandert per bestand (indicatief, uit te werken in het plan)

- `app/werk/page.tsx` — geen `ShowcaseViews`/`GateView` meer; nieuwe sectie-opbouw met de zes
  stappen, `Fleet variant="journey"`, en `DemoPanel`/`DemoSheet`/`DemoProvider` aan het eind.
- `components/showcase/gate-view.tsx`, `technisch-view.tsx`, `showcase-views.tsx` — vervallen
  of worden herbouwd tot de nieuwe sectie-componenten; `technisch-data.tsx` (CHECKS/METRICS/
  ROADMAP) blijft als databron staan.
- `components/showcase/run-data.tsx` — blijft de bron voor de kernzinnen/diepgang per sectie,
  gecomprimeerd van 12 naar 6 haltes.
- `app/werk/logboek/page.tsx`, `components/showcase/run-log*.tsx`, `facts-aside.tsx` —
  vervallen; geen aparte logboek-route meer.
- `app/werk/readme/page.tsx` — ongewijzigd.
- `lib/fleet-geometry.ts`, `lib/use-fleet-scene.ts`, `components/fleet.tsx` — uitgebreid met
  de nieuwe vormen en de `journey`-variant; bestaande `hero`/`ambient`-gedrag blijft intact.
- `app/styles/fleet.css` — nieuwe regels voor de `journey`-laag (vermoedelijk vrijwel gelijk
  aan `.kh-ambient`, mogelijk hogere opaciteit).

## Buiten scope

- De homepage-projectkaart (`app/page.tsx`) linkt nu naar `/werk/logboek/` en `/werk/#technisch`
  — die links moeten mee veranderen, maar de kaart zelf wordt in dit ontwerp niet herzien.
  Wordt onderdeel van het implementatieplan, geen apart ontwerp.
- Geen nieuwe projecten op `/werk/` (blijft uitsluitend deSchouwVloot, zoals besloten).
- Geen wijzigingen aan `/werk/readme/`.
