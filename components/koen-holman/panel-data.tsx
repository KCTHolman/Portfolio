import type { ReactNode } from 'react'

export type Panel = {
  num: string
  title: string
  body: ReactNode
}

export const PANELS: Panel[] = [
  {
    num: '01',
    title: 'Nu',
    body: (
      <>
        Support developer bij <strong>Indicia</strong> in Tilburg. Ik kom in veel verschillende
        systemen &mdash; onderhoud ze, los storingen op en duik net zo makkelijk in code die ik
        gisteren nog niet kende. Die breedte houdt me scherp, en ik ben graag het aanspreekpunt:
        technisch &eacute;n richting de klant.
      </>
    ),
  },
  {
    num: '02',
    title: 'Achtergrond',
    body: (
      <>
        Jaren ervaring in full stack development, breed inzetbaar en altijd lerend. Met een sterke
        nieuwsgierigheid naar AI.
      </>
    ),
  },
  {
    num: '03',
    title: 'De vloot',
    body: (
      <>
        Wat een hobbyproject was, is stilletjes iets serieus geworden: een vloot waarin AI-agents het
        werk in mijn projecten doen &mdash; van idee tot opgeleverde code &mdash; en ik alleen op de
        belangrijke momenten beslis. Wat begon als &eacute;&eacute;n project draait inmiddels los,
        zodat meerdere projecten er tegelijk op meeliften.
      </>
    ),
  },
  {
    num: '04',
    title: 'Tegen drift',
    body: (
      <>
        Bij lange taken verliest een AI wel eens de rode draad, of er sluipt langzaam drift in en hij
        bouwt keurig verder in de verkeerde richting. Dat los je niet op met een beter model, maar
        met kleine stations die elk maar &eacute;&eacute;n ding hoeven te weten, elke stap
        automatisch nagelopen &mdash; en een stop na twee mislukte pogingen.
      </>
    ),
  },
  {
    num: '05',
    title: 'Twee lessen',
    body: (
      <>
        Een plan wordt eerst getoetst: een tweede AI heeft als enige opdracht het af te keuren, en
        pas als het die toets overleeft mag er gebouwd worden. En niet elk karwei vraagt om het
        zwaarste model &mdash; opruimwerk draait op goedkope modellen of simpele scriptjes, het zware
        model is er alleen voor als er echt nagedacht moet worden.
      </>
    ),
  },
]
