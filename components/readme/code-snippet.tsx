'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

/* Een codeblok met een kopieerknop.
 *
 * De knop wordt hiervandaan gerenderd en niet uit de HTML: navigator.clipboard
 * bestaat alleen in een secure context, en op http:// zou de knop er wel staan
 * en dan stilletjes niets doen. */

const RESET_MS = 2000

type CopyState = 'idle' | 'done' | 'failed'

const LABELS: Record<CopyState, string> = {
  idle: 'kopieer',
  done: 'gekopieerd',
  failed: 'mislukt',
}

/* Verandert nooit tijdens de levensduur van de pagina — er valt dus niets te
 * abonneren, alleen veilig te lezen. useSyncExternalStore in plaats van
 * useState+useEffect: dat laatste zet canCopy pas ná de eerste verf om, dus
 * de knop popt zichtbaar op. Dit leest de servervriendelijke `false` tijdens
 * SSR/hydration en de echte waarde meteen daarna, zonder de tussenstap die
 * de flits veroorzaakte. */
function subscribeNever(): () => void {
  return () => {}
}

function getCanCopySnapshot(): boolean {
  return Boolean(navigator.clipboard) && window.isSecureContext
}

function getCanCopyServerSnapshot(): boolean {
  return false
}

export function CodeSnippet({ lang, children }: { lang: string; children: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null)
  const [state, setState] = useState<CopyState>('idle')
  const canCopy = useSyncExternalStore(subscribeNever, getCanCopySnapshot, getCanCopyServerSnapshot)

  useEffect(() => {
    if (state === 'idle') return
    const timer = window.setTimeout(() => setState('idle'), RESET_MS)
    return () => window.clearTimeout(timer)
  }, [state])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(preRef.current?.textContent ?? '')
      setState('done')
    } catch {
      // Geweigerd door de browser of door beleid. Dat eerlijk zeggen is beter
      // dan een knop die zich voordoet alsof het gelukt is.
      setState('failed')
    }
  }, [])

  return (
    <div
      className="gh-snippet"
      data-lang={lang}
      /* Zegt tegen readme.css dat de rechterbovenhoek nu bezet is. */
      {...(canCopy ? { 'data-copyable': '' } : {})}
    >
      <span className="gh-lang-tag" aria-hidden="true">
        {lang}
      </span>
      <pre ref={preRef}>
        <code>{children}</code>
      </pre>
      {canCopy ? (
        <button
          type="button"
          className="gh-copy"
          aria-label={`Kopieer het ${lang}-blok`}
          onClick={copy}
          {...(state === 'done' ? { 'data-done': '' } : {})}
        >
          {LABELS[state]}
        </button>
      ) : null}
    </div>
  )
}
