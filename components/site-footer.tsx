import { AuroraSwatches } from '@/components/aurora/aurora-swatches'

export function SiteFooter() {
  return (
    <footer className="kh-footer">
      <div className="kh-footer-inner">
        <div className="kh-footer-line">
          <span>Koen Holman &middot; Tilburg</span>
          <span>Software engineer &middot; full stack &amp; AI</span>
        </div>
        {/* Na de tekstregel: op een smal scherm wordt die z'n eigen
            veegbare rij, en de swatches komen eronder. */}
        <AuroraSwatches />
      </div>
    </footer>
  )
}
