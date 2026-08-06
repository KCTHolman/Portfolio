import { HomeHero } from '@/components/home-hero'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Koen Holman — Software engineer, full stack & AI',
  description:
    'Koen Holman, software engineer uit Tilburg. Full stack development en AI-native CI/CD: pijplijnen waarin agents het werk doen en een mens op drie plekken beslist.',
  path: '/',
})

export default function HomePage() {
  return <HomeHero />
}
