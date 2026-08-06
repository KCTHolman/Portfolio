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
