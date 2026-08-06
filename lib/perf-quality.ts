'use client'

/* Gedeeld "dit apparaat is traag"-signaal. De vloot-canvas
   (use-fleet-scene.ts) en de aurora-achtergrond (aurora-provider.tsx) meten
   allebei hun eigen framegat en schrijven hierheen zodra een van beide een
   structureel trage machine vaststelt — de ander leest 'm terug en degradeert
   meteen mee, ook binnen hetzelfde bezoek, ook op een pagina die zelf geen
   vloot toont. Persistent via localStorage: geen machine wordt sneller tussen
   twee bezoeken, dus een volgend bezoek (of de volgende pagina) start direct
   laag in plaats van de terugval opnieuw te laten zien. */
const QUALITY_STORE_KEY = 'kh-fleet-quality'

export function readReducedQuality(): boolean {
  try {
    return localStorage.getItem(QUALITY_STORE_KEY) === 'reduced'
  } catch {
    // Privémodus of een volle quota: dit bezoek meet dan gewoon opnieuw.
    return false
  }
}

export function writeReducedQuality(): void {
  try {
    localStorage.setItem(QUALITY_STORE_KEY, 'reduced')
  } catch {
    // Zie readReducedQuality().
  }
}

/** iPhone/iPad, ongeacht welke browser — Chrome/Firefox op iOS zijn zelf ook
 *  WebKit onder de motorkap (Apple staat geen andere engine toe), dus dit is
 *  geen Safari-specifieke check maar een WebKit-op-iOS-check. Bestaat apart
 *  van readReducedQuality() hierboven: dat signaal is "dit apparaat is
 *  gemeten als traag", dit is "deze renderengine heeft een structurele
 *  zwakte" (software-rasterisatie van SVG-filters, zie aurora-provider.tsx)
 *  — die geldt ook op een snel toestel, dus verdient een eigen, meteen
 *  toegepaste vlag in plaats van te wachten tot de framegat-meting het
 *  vaststelt. iPad meldt zich sinds iPadOS 13 als "Macintosh" in de
 *  user-agent (voor desktop-class sites) — maxTouchPoints is het algemeen
 *  gebruikte onderscheid met een echte Mac, die dat nooit rapporteert. */
export function isIOSWebKit(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPod/.test(ua)) return true
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
}
