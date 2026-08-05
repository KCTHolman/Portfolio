import { KoenHolmanPage } from '@/components/koen-holman/koen-holman-page'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Koen Holman — software engineer in Tilburg',
  description:
    'Support engineer bij Indicia in Tilburg, met jaren ervaring in full stack development en een sterke nieuwsgierigheid naar AI. Neem contact op via LinkedIn of GitHub.',
  path: '/koen-holman/',
})

export default function Page() {
  return <KoenHolmanPage />
}
