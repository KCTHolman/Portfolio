# Over + Contact samen op /koen-holman/, met een tandwiel/raket-vloot rechtsboven

**Status:** ontwerp, klaar voor implementatieplan
**Branch:** `claude/werk-scroll-vloot`

## Doel

`/over/` en `/contact/` bestaan nu als twee losse pagina's met overlappende inhoud (beide
hebben al een LinkedIn/GitHub-linkrij). Ze worden samengevoegd tot één nieuwe pagina,
`/koen-holman/`, die in één scherm past — geen scroll, net als de homepage. De bestaande
`ambient`-vloot maakt op deze pagina plaats voor een nieuwe, opvallende variant rechtsboven:
een vloot bootjes die op zijn beurt in een lading raketjes en daarna in een stelsel van
in elkaar grijpende tandwielen verandert, elke 40 seconden wisselend, in een lus.

## Uitgangspunten uit het gesprek

- Dit gaat alleen over de nieuwe `/koen-holman/`-pagina, niet over hoe `ambient` elders
  (readme, foutpagina) werkt — die blijven ongewijzigd.
- Indeling: tekst links, de nieuwe vloot-animatie rechts — hetzelfde soort illusie als
  `/werk/` en de homepage al geven (schermvullende canvaslaag, tekstkolom er overheen),
  geen echte CSS-grid-kolom.
- De animatie mag nadrukkelijk "over the top" zijn: geen bescheiden hoekje, een drukke,
  opvallende formatie.
- Alle inhoud (titel, knoppenrij, vijf panelen) moet in één scherm passen. De vijf bestaande
  Over-panelen ("Nu", "Achtergrond", "De vloot", "Tegen drift", "Twee lessen") blijven allemaal
  bestaan, maar worden **tabs**: één zichtbaar tegelijk, in plaats van een grid dat verticaal
  meer ruimte kost dan er is.
- De scène-wissel moet vloeiend zijn (dezelfde deeltjes-morph-taal als `/werk/`), geen
  uiteenspatten-en-opnieuw-opbouwen — dat is nieuwe animatie-logica die niet nodig is zolang
  de morph-machinery van `/werk/` al bestaat.
- De raketjes vliegen niet echt van het scherm af: de scène duurt 40 seconden en moet
  zichzelf herhalen, dus de lancering is een doorlopende lus (stijgen, naflakkeren, weer
  zakken) in plaats van een eenmalig vertrek.
- De link in de hoofdnavigatie mag "Koen Holman" heten in plaats van "Over" en "Contact"
  apart.

## Routes & navigatie

- Nieuwe route `app/koen-holman/page.tsx` met de samengevoegde inhoud.
- `app/over/page.tsx` en `app/contact/page.tsx` worden permanente redirects naar
  `/koen-holman/` (bestaande links/bookmarks blijven werken).
- `lib/nav.ts`: de regels voor `/over/` en `/contact/` worden vervangen door één regel:
  `{ href: '/koen-holman/', label: 'Koen Holman' }`. `components/view-transitions.tsx` bepaalt
  de richting van een paginawissel op basis van de volgorde in `NAV_ITEMS` — met een item
  minder in de lijst moet gecontroleerd worden dat die logica geen aanname doet over een
  vaste lijstlengte.
- `pageMetadata()` voor de nieuwe pagina combineert de titel/omschrijving van de huidige
  Over- en Contact-metadata (uit te werken in het implementatieplan, geen nieuw
  ontwerpvraagstuk).

## Indeling van de pagina

Zelfde patroon als `.kh-main--home` (zie `app/styles/site.css`): de main krijgt
`flex: 1 0 auto; display:flex; flex-direction:column; justify-content:center` binnen
`.kh-shell`, zodat de inhoud verticaal gecentreerd tussen top en footer past zonder dat de
pagina hoeft te scrollen op een normale laptop-hoogte. Een nieuwe `.kh-main--koen-holman`-regel
in `site.css` regelt dit, net als `.kh-main--home` dat nu al doet.

Links, van boven naar beneden, in een tekstkolom die (zoals `/werk/`) een `max-width` aanhoudt
zodat de animatie rechts de ruimte krijgt:

1. Eyebrow + titel: hergebruik van de huidige Over-titel ("Bouwen, en het *waarom* erbij"),
   met de uitnodigingszin van de huidige Contact-pagina ("Altijd in voor een goed gesprek over
   software, AI en alles ertussenin.") als lead eronder — exacte bewoording is
   implementatiedetail, geen ontwerpvraag.
2. Dezelfde knoppenrij (`kh-cta-row`) als nu op Over: LinkedIn, Instagram, GitHub, Indicia.
   Dekt de contact-functie al af; er komt geen aparte tweede linkrij bij.
3. De vijf bestaande panelen als tabs: kleine tabjes (bijvoorbeeld de nummers 01–05, of de
   titels "Nu"/"Achtergrond"/"De vloot"/"Tegen drift"/"Twee lessen") schakelen welk paneel
   zichtbaar is. Geen tekst gaat verloren; de content per paneel blijft ongewijzigd uit het
   huidige `PANELS`-array in `app/over/page.tsx` (verhuist naar een gedeeld bestand, bv.
   `components/koen-holman/panel-data.tsx`).

Dit is een nieuw, eigen client-component (naar het patroon van `components/werk/werk-journey.tsx`):
`components/koen-holman/koen-holman-page.tsx`, met lokale React-state voor welke tab actief is.

## De animatie: een nieuwe vloot-variant, rechtsboven, met drie scènes

### Wat er al staat (hergebruikt, niet opnieuw gebouwd)

`lib/fleet-geometry.ts` heeft via de `journey`-variant van `/werk/` al:

- Een tandwiel-vorm (`GEAR_STAGE`) en een raket-vorm (`ROCKET_STAGE`), genormaliseerd in
  hetzelfde vak als de boot en deeltje-voor-deeltje overeenkomstig aan de boot-vorm
  (`BOAT_STAGE`) — dat is precies de deeltjes-pariteit die het vloeiend morphen mogelijk
  maakt, en die hier hergebruikt wordt in plaats van opnieuw uitgevonden.
- Een morph-mechanisme in `lib/use-fleet-scene.ts` (`buildJourneyStage`, `journeyStage`/
  `journeyNext`/`journeyT`) dat per deeltje interpoleert tussen twee vormen.
- Een eigen-klok-mechaniek (`nextLaunchAt`/`launchPhase` voor de losse hero-lancering) als
  precedent voor "iets dat op een timer gebeurt, niet op scroll of hover".

### Wat erbij komt

- **Nieuwe `FleetVariant`: `'showcase'`.** Eigen boot-anker-set in `fleet-geometry.ts`
  (werknaam `SHOWCASE_BOATS`), zo'n 7 stuks, geclusterd rechtsboven (`cx` circa 0.62–0.95,
  `cy` circa 0.08–0.42) in plaats van verticaal gecentreerd zoals `hero`/`journey` — dat is
  wat "rechtsboven" hier concreet betekent, zonder dat er een nieuwe CSS-kolom nodig is.
- **Van één morphende vorm naar meerdere tegelijk.** De bestaande `journey`-morph werkt op
  precies één vorm (index 0). Voor `showcase` moet dezelfde interpolatietechniek toegepast
  worden op elk van de 7 boten onafhankelijk: iedere boot morft deeltje-voor-deeltje naar
  haar eigen raketje, en later naar haar eigen tandwiel. Dat is een generalisatie van de
  bestaande code (nu hardcoded op boot-index 0), geen nieuw algoritme.
- **Drie scènes op een lus van 3× 40 seconden**, bijgehouden met dezelfde
  `performance.now()`-aanpak als `nextLaunchAt`:
  1. **Vloot** — de 7 boten in hun ankerformatie, normaal varend (bestaand gedrag,
     `BOAT_STAGE`).
  2. **Een lading raketjes** — alle boten morphen gelijktijdig naar `ROCKET_STAGE`. Nieuw
     stuk logica: een doorlopende stijg-en-zak-lus (in plaats van de bestaande, eenmalige
     `launchRocketRise` van de hero-variant) zodat het aanvoelt als herhaaldelijk lanceren
     zolang de scène duurt, zonder dat de vorm het zichtbare gebied verlaat.
  3. **Tandwielen die in elkaar grijpen** — de boten schuiven eerst naar een compacte
     cluster-formatie (een paar grote, een paar kleine, tegen elkaar aan geplaatst) en
     morphen dan naar `GEAR_STAGE`-varianten. Nieuw: verschillende tandwiel-groottes/
     tandaantallen per boot (via de bestaande `gearPoly()`-helper met andere parameters,
     dus geen nieuwe tekenlogica, alleen andere argumenten) zodat niet alle tandwielen
     identiek ogen. Nieuw: een **doorlopende rotatie** per tandwiel zodra deze scène actief
     is — iets dat het bestaande systeem nog niet kent (het kompas heeft alleen een kleine
     naald-wiebel, `journey` zelf roteert nooit als geheel). Buren draaien tegengesteld
     (even boot-index met de klok mee, oneven tegen de klok in) om het in-elkaar-grijpen te
     verkopen.
  - Overgang tussen scènes: vloeiende deeltjes-morph van ~1,5 seconde, zoals bij `/werk/`
    tussen twee secties.
- **Positionering:** `position: fixed; inset: 0` zoals de andere varianten (nieuwe regel
  `.kh-showcase` in `fleet.css`, vrijwel gelijk aan `.kh-journey`). De boten liggen dankzij
  hun anchors al rechtsboven; er is geen aparte begrenzende doos nodig.
- **Reduced motion / smal scherm / grove pointer:** zelfde `frozen`-gedrag als de rest —
  toont alleen de vlootscène statisch, geen wisseling, geen rotatie. Geen nieuwe uitzondering
  nodig, de bestaande `frozen`-prop in `useFleetScene` dekt dit al af zolang `showcase` zich
  overal hetzelfde gedraagt als `hero`/`journey` op dat punt.

## Wat verdwijnt / verandert per bestand (indicatief, uit te werken in het plan)

- `app/over/page.tsx`, `app/contact/page.tsx` — worden redirects naar `/koen-holman/`.
- `app/koen-holman/page.tsx` — nieuw, server component met gecombineerde metadata, rendert
  `KoenHolmanPage`.
- `components/koen-holman/koen-holman-page.tsx` — nieuw, client component: hero, knoppenrij,
  tab-geschakelde panelen, `<Fleet variant="showcase" />`.
- `components/koen-holman/panel-data.tsx` — nieuw (of hernoemd vanuit het `PANELS`-array in
  het huidige `app/over/page.tsx`).
- `components/fleet.tsx` — `FleetProps`-union krijgt `{ variant: 'showcase' }` (geen
  `progressRef`/`githubHoverRef` nodig, wel een eigen interne klok zoals `hero` die al heeft).
- `lib/fleet-geometry.ts` — `SHOWCASE_BOATS`, en de tandwiel/raket-vormen worden
  parametriseerbaar gemaakt voor meerdere groottes/tandaantallen per boot in plaats van één
  vaste `GEAR_STAGE`/`ROCKET_STAGE`.
- `lib/use-fleet-scene.ts` — de morph toegepast op meerdere boten tegelijk in plaats van
  alleen boot-index 0; een nieuwe scène-klok (vloot/raketten/tandwielen, 40s per stap); een
  doorlopende rotatie tijdens de tandwiel-scène; een doorlopende stijg-lus tijdens de
  raketten-scène.
- `app/styles/fleet.css` — nieuwe `.kh-showcase`-regel.
- `app/styles/site.css` — nieuwe `.kh-main--koen-holman`-regel (zelfde one-screen-patroon als
  `.kh-main--home`); `.kh-main--over`/`.kh-main--contact` vervallen als ze nergens anders meer
  gebruikt worden.
- `lib/nav.ts` — "Over"/"Contact" worden één regel "Koen Holman".

## Performance/toegankelijkheid

Geen nieuwe regels nodig — dezelfde `prefers-reduced-motion`/smal-scherm/grove-pointer-hooks
die `hero`/`ambient`/`journey` al gebruiken (`usePrefersReducedMotion`, `useNarrowScreen`,
`useMediaQuery('(pointer: coarse)')` in `components/fleet.tsx`) dekken ook `showcase` af.

## Buiten scope

- Geen wijzigingen aan hoe `ambient` op andere pagina's (readme, foutpagina) werkt.
- Geen herziening van de exacte copy (titel/lead-tekst) — de bestaande Over/Contact-teksten
  worden hergebruikt en samengevoegd, geen nieuwe tekst bedacht in dit ontwerp.
- Geen wijziging aan de bestaande `hero`-lancering (de losse, willekeurige boot-naar-raketje
  op de homepage) — die blijft ongemoeid naast de nieuwe `showcase`-variant.
