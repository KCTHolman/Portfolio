import { PlaygroundView } from '@/components/playground/playground-view'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Playground — Koen Holman',
  description:
    'De vloot losgekoppeld van elke pagina: schakel zelf tussen alle Fleet-varianten en stuur de journey-voortgang met de hand.',
  path: '/playground/',
})

export default function PlaygroundPage() {
  return <PlaygroundView />
}
