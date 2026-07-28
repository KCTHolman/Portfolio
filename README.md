# Koen Holman — portfolio

Statische site: vier pagina's, geen build-stap, geen dependencies. Je kunt elk
bestand openen, aanpassen en direct het resultaat zien.

## Structuur

```
index.html              Home
werk/index.html         AI-projecten + de deSchouwVloot-showcase
over/index.html         Over
contact/index.html      Contact
404.html                Niet-gevonden-pagina (volledig self-contained)

assets/
  site.css              Shell: kleur, typografie, header, nav, footer, cards
  fonts.css + fonts/    Space Grotesk + Cormorant Garamond, zelf gehost
  aurora.css / .js      De bewegende achtergrond en het "Come play…"-paneel
  widget.css / .js      De acht-stations-pijplijn op /werk
  og.png                Social card (1200x630)
  favicon.*             Iconen, gerenderd uit hetzelfde palet

tools/set-site-url.py   Zet de site op een ander publiek adres
archief/                De oude site, bewaard maar niet meer gelinkt
```

## Lokaal bekijken

```bash
python3 -m http.server 8000
# http://localhost:8000
```

Openen via `file://` werkt niet: de pagina's laden CSS en JS als losse
bestanden, en browsers blokkeren dat op het `file:`-protocol.

## Publiceren

Alle interne links en assets zijn relatief, dus de site draait zowel op een
domeinwortel (`example.nl/werk/`) als in een submap
(`gebruiker.github.io/portfolio/werk/`). Er is niets te bouwen — de map zoals
hij hier staat ís de site.

Eén ding is wel absoluut: de canonical-tags, `og:url`, `og:image`, `robots.txt`
en `sitemap.xml` bevatten het volledige adres. Na een verhuizing:

```bash
python3 tools/set-site-url.py https://jouw-domein.nl
```

Dat is het enige wat je hoeft aan te passen.

> **Let op bij een submap-deploy:** `404.html` gebruikt absolute paden
> (`/assets/...`), omdat een 404 wordt uitgeleverd op het adres dat de bezoeker
> intikte — relatieve paden zijn daar niet te vertrouwen. De pagina heeft zijn
> eigen stijlen inline staan, dus hij ziet er altijd goed uit; alleen de
> weblettertypen en de link naar home gaan in een submap naar de verkeerde plek.

## Herkomst

De pagina's komen uit een Claude Design-prototype (`index.dc.html` en
consorten). Die prototypes draaiden op een runtime (`support.js`) met
`<dc-import>`, `{{ bindings }}` en een React-achtige `DCLogic`-klasse. Voor
publicatie is dat allemaal weggewerkt: het ontwerp is één op één overgenomen,
de logica is herschreven in vanilla JS.

Wat daarbij bewust is toegevoegd:

- **Lettertypen zelf gehost** in plaats van via Google Fonts — sneller, en geen
  bezoekers-IP's naar een CDN. De rechte snedes zijn variabel (wght 300–700),
  dus zes bestanden dekken alle gewichten.
- **Inhoud staat in de HTML.** De acht stations van de showcase staan voluit in
  `werk/index.html`; `widget.js` bouwt de brede rail daaruit op. Zoekmachines
  en bezoekers zonder JavaScript zien de volledige tekst.
- **Toetsenbord en screenreader.** De klikbare `div`s uit het prototype zijn
  echte `button`s geworden, met `aria-expanded`, `aria-pressed` en
  `aria-current`. Elke pagina heeft een skip-link.
- **`prefers-reduced-motion`** zet de aurora stil in plaats van hem te laten
  drijven.
- **SEO en sociale kaarten**: canonicals, Open Graph, JSON-LD, sitemap,
  robots.txt, favicons en een web-manifest.

Eén eigenaardigheid is met opzet overgenomen: de twee ronddraaiende vlekken in
de aurora declareren zowel een spin- als een drift-animatie op `transform`.
CSS laat er daar maar één van winnen, en dat is de drift. Zo zag het ontwerp
eruit, dus zo staat het er.
