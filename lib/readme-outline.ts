/** De koppen van het bestand, in leesvolgorde.
 *
 *  De id's zijn GitHub-slugs: #zelf-draaien landt hier en op GitHub op
 *  dezelfde kop, dus een gekopieerde link werkt aan beide kanten. Zowel de
 *  koppen als de outline-rail lezen uit deze lijst, zodat de twee niet uit
 *  elkaar kunnen lopen. */
export const OUTLINE = [
  {
    id: 'deschouwvloot--een-ai-native-cicd-pijplijn-als-showcase',
    label: 'deSchouwVloot',
    depth: 1,
  },
  { id: 'waarom-dit-interessant-is', label: 'Waarom dit interessant is', depth: 2 },
  { id: 'hoe-het-werkt', label: 'Hoe het werkt', depth: 2 },
  { id: 'beveiliging-van-déze-repo', label: 'Beveiliging van déze repo', depth: 2 },
  { id: 'wat-er-uit-deze-kopie-is-gehaald-en-waarom', label: 'Wat eruit is gehaald', depth: 3 },
  { id: 'wat-er-bewust-wél-in-staat', label: 'Wat er wél in staat', depth: 3 },
  { id: 'zelf-draaien', label: 'Zelf draaien', depth: 2 },
] as const
