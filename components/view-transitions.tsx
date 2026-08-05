'use client'

/* ==========================================================================
   Paginawissels met een richting.

   Het origineel hing aan de Navigation API en `pagereveal`, en dat zijn
   cross-document view transitions: het browser-mechanisme dat afgaat als de
   ene document-load de andere vervangt. Onder de App Router gebeurt dat niet
   meer — er is nog één document, de router wisselt alleen de inhoud. Die
   route loopt dus dood, en dit vervangt hem.

   Wat hetzelfde blijft is wat site.css leest: een transitie-type kh-forward
   of kh-back, afgeleid uit de leesvolgorde van de hoofdnavigatie, waar de
   :active-view-transition-type()-regels aan hangen.
   ========================================================================== */

import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'

/** De leesvolgorde van de hoofdnavigatie. Verder naar rechts is vooruit. */
const ORDER = ['/', '/werk/', '/over/', '/contact/']

type TransitionType = 'kh-forward' | 'kh-back'

function normalize(path: string): string {
  const clean = path.replace(/index\.html$/i, '')
  if (clean !== '/' && clean.endsWith('/')) return clean.slice(0, -1) || '/'
  return clean
}

const ORDER_NORMALIZED = ORDER.map(normalize)

function directionBetween(from: string, to: string): TransitionType | null {
  const fromIndex = ORDER_NORMALIZED.indexOf(normalize(from))
  const toIndex = ORDER_NORMALIZED.indexOf(normalize(to))
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return null
  return toIndex > fromIndex ? 'kh-forward' : 'kh-back'
}

type NavigateFn = (href: string) => void

const NavigateContext = createContext<NavigateFn | null>(null)

export function useViewTransitionNavigate(): NavigateFn | null {
  return useContext(NavigateContext)
}

type StartViewTransitionOptions = {
  update: () => Promise<void>
  types?: string[]
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (
    callbackOrOptions: (() => Promise<void>) | StartViewTransitionOptions,
  ) => unknown
}

export function ViewTransitions({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  /* De router navigeert asynchroon, maar startViewTransition wil weten
     wanneer de DOM klaar is. Dit is de brug: de belofte blijft open tot het
     pad daadwerkelijk gewisseld is. */
  const pending = useRef<(() => void) | null>(null)

  useEffect(() => {
    pending.current?.()
    pending.current = null
  }, [pathname])

  /* Blijft de navigatie hangen — een route die niet bestaat, een afgebroken
     prefetch — dan mag de transitie niet eeuwig het scherm bevriezen. */
  useEffect(() => {
    return () => {
      pending.current?.()
      pending.current = null
    }
  }, [])

  const navigate = useCallback<NavigateFn>(
    (href) => {
      const doc = document as DocumentWithViewTransition
      const target = new URL(href, window.location.href)

      const type = directionBetween(pathname, target.pathname)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (!doc.startViewTransition || reduceMotion || !type) {
        router.push(href)
        return
      }

      doc.startViewTransition({
        update: () =>
          new Promise<void>((resolve) => {
            pending.current = resolve
            startTransition(() => router.push(href))
          }),
        types: [type],
      })
    },
    [pathname, router],
  )

  return <NavigateContext.Provider value={navigate}>{children}</NavigateContext.Provider>
}
