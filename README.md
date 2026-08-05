# Koen Holman — portfolio

Next.js (App Router), React en TypeScript. Zes pagina's, geen CSS-framework,
geen UI-bibliotheek — de stijlen zijn met de hand geschreven en staan in
`app/styles/`.

> Dit was tot voor kort een statische site zonder build-stap. Die belofte is
> vervallen: er is nu een `npm install` en een `next build` nodig. Wat bleef is
> dat er verder niets bij komt kijken — de enige dependencies zijn Next, React
> en de types.

## Structuur

```
app/
  layout.tsx              De gedeelde shell: header, nav, footer, aurora
  page.tsx                Home
  werk/page.tsx           AI-projecten + de deSchouwVloot-showcase
  werk/logboek/           Verhalend: één run door de pijplijn, stap voor stap
  werk/readme/            Technisch: de README van deSchouwVloot, gerenderd
  over/ · contact/        Over en Contact
  not-found.tsx           Niet-gevonden-pagina
  sitemap.ts · robots.ts  Gegenereerd uit SITE_URL
  styles/                 Alle CSS, ongewijzigd overgenomen uit de oude site

components/
  aurora/                 De bewegende achtergrond en de presetrij in de footer
  showcase/               De drie weergaven van deSchouwVloot en het logboek
  demo/                   De speelbare cafeïne-demo onderaan het logboek
  readme/                 Kopieerknoppen en de outline-rail op /werk/readme/
  fleet.tsx               De vloot: het canvas-beeldmerk
  link.tsx                next/link, maar via de view transition
  view-transitions.tsx    Richting van een paginawissel (kh-forward / kh-back)

lib/
  aurora.ts               Presets en kleurwiskunde, puur en zonder DOM
  fleet-geometry.ts       De vorm van de schouw, puur en zonder DOM
  caffeine.ts             De rekenkern van de demo (halfwaardetijd, melding)
  metadata.ts             SITE_URL en de metadata per pagina
  nav.ts · readme-outline.ts

public/assets/            Lettertypen, iconen, social card
archief/                  De oude site, bewaard maar niet meer gelinkt
```

De scheiding die overal terugkomt: wat puur is staat in `lib/` — geen DOM, geen
tijd, geen toeval — en de component eromboven doet alleen de lifecycle. Dat
geldt voor de aurora (kleur per frame), de vloot (honderden driehoekjes die één
schouw vormen) en de demo (wat er van een dosis cafeïne overblijft).

### /werk/readme/ — waarom die tekst hier een tweede keer staat

De pagina rendert de README van
[KCTHolman/deSchouwVloot](https://github.com/KCTHolman/deSchouwVloot) met de
hand, als JSX. Geen markdown-parser: de inhoud staat in het bestand. Dat
betekent wél dat die tekst op twee plekken leeft. De afspraak daarbij:

- **De tekst is letterlijk die van `README.md`.** Wijkt de repo af, dan is deze
  pagina fout, niet de repo.
- **Alleen de links zijn omgezet**, naar absolute adressen in
  `github.com/KCTHolman/deSchouwVloot` — relatieve paden uit een README wijzen
  hier nergens naar. Elke link in de body krijgt daarom een ↗ en opent in een
  nieuw tabblad. Die afwijking staat ook op de pagina zelf benoemd.
- **De kop-`id`'s zijn GitHub-slugs.** `#zelf-draaien` landt hier en op GitHub
  op dezelfde kop, dus een gekopieerde link werkt aan beide kanten. Ze staan in
  `lib/readme-outline.ts`, zodat de koppen en de outline-rail niet uit elkaar
  kunnen lopen.

## Lokaal draaien

```bash
npm install
npm run dev
# http://localhost:3000
```

```bash
npm run build && npm start   # productiebuild
npm run typecheck            # tsc --noEmit
npm run doctor               # npx react-doctor@latest --verbose
```

## Publiceren

Eén constante draagt het publieke adres: `SITE_URL` in `lib/metadata.ts`. De
canonicals, `og:url`, `og:image`, de sitemap en robots.txt lezen daaruit. Na een
verhuizing is dat de enige regel die verandert — het script dat die waarde
vroeger over acht bestanden moest bijwerken (`tools/set-site-url.py`) is daarmee
overbodig geworden en verwijderd.

### Vercel

Koppel de repo in het dashboard; Vercel herkent Next.js en bouwt vanzelf. Elke
push naar `master` deployt, elke PR krijgt een preview-URL.

`vercel.json` houdt vast: `X-Content-Type-Options`, `Referrer-Policy`, de
Content-Security-Policy, plus de cache-headers voor `public/assets/`
(lettertypen een jaar, iconen een dag). `trailingSlash` staat in
`next.config.ts`. `.vercelignore` houdt `archief/` en dit bestand buiten de
deploy.

### De CSP, en wat die kost

De oude policy had `script-src 'self'`: geen enkel inline script. Dat kan onder
Next niet blijven staan — het framework zet z'n eigen bootstrap- en
hydration-scripts inline in de HTML, en die zou die header blokkeren. Er zijn
drie uitwegen en ze kosten alle drie iets:

| | |
|---|---|
| nonce per verzoek | policy blijft even streng; de HTML kan niet meer statisch van de CDN komen |
| hashes | onwerkbaar: ze veranderen bij elke build |
| **`'unsafe-inline'`** | pagina's blijven statisch, maar élk inline script mag — precies wat de header tegenhield |

Hier staat de `'unsafe-inline'`-variant, in `vercel.json`, statisch uitgeleverd
(`○ Static` in de build-output). De site heeft geen forms, geen auth en geen
user-data, en de enige inline scripts zijn Next's eigen hydration-bootstrap —
tegen dat threat model weegt de CDN-caching en de lagere TTFB van een
volledig statische build zwaarder dan de marginale winst van een nonce. Wil je
de striktere policy terug, zet dan een `proxy.ts` (Next 16's naam voor
middleware) terug die per verzoek een nonce genereert en op de policy zet, én
een `await headers()` in `app/layout.tsx` — zonder dat laatste kan Next de
nonce niet per verzoek op z'n eigen scripts zetten, en zou de header de eigen
hydration blokkeren.

## Herkomst

De pagina's komen uit een Claude Design-prototype. Voor publicatie is dat
weggewerkt: het ontwerp is één op één overgenomen, de logica eerst herschreven
in vanilla JS en daarna — bij deze migratie — in React.

Wat daarbij bewust is toegevoegd of behouden:

- **Lettertypen zelf gehost** in plaats van via Google Fonts — sneller, en geen
  bezoekers-IP's naar een CDN. `app/styles/fonts.css` is met de hand
  geschreven en blijft dat: `next/font/local` kent geen `unicode-range` per
  bestand, en dan zou de latin/latin-ext-splitsing vervallen en iedereen beide
  bestanden downloaden.
- **Inhoud staat in de JSX.** De twaalf stappen van de run staan voluit in
  `components/showcase/run-data.tsx`; de rail-ticks, de teller en het logboek
  komen daar alle drie uit. Zoekmachines en bezoekers zonder JavaScript zien de
  volledige tekst — zonder JS staat de run uitgeklapt en zonder poorten.
- **Toetsenbord en screenreader.** Echte `button`s met `aria-pressed` en
  `aria-current`, en een skip-link op elke pagina.
- **`prefers-reduced-motion`** zet de aurora en de vloot stil in plaats van ze
  te laten drijven. Op telefoonbreedte draaien beide gewoon mee — de statische
  build en de lazy-loaded vloot (`components/fleet-lazy.tsx`) houden de kosten
  daar al laag genoeg.
- **SEO en sociale kaarten**: canonicals, Open Graph, JSON-LD, sitemap,
  robots.txt, favicons en een web-manifest.

Eén eigenaardigheid is met opzet overgenomen: de twee ronddraaiende vlekken in
de aurora declareren zowel een spin- als een drift-animatie op `transform`.
CSS laat er daar maar één van winnen, en dat is de drift. Zo zag het ontwerp
eruit, dus zo staat het er.
