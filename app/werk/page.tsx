import { WerkJourney } from '@/components/werk/werk-journey'
import { pageMetadata } from '@/lib/metadata'

import '@/app/styles/widget.css'

export const metadata = pageMetadata({
  title: 'AI-projecten — Koen Holman',
  description:
    'deSchouwVloot: een AI-native CI/CD-pijplijn waarin agents het werk doen en een mens op precies drie plekken beslist. Elke bewering is machinaal te controleren.',
  path: '/werk/',
})

export default function WerkPage() {
  return <WerkJourney />
}
