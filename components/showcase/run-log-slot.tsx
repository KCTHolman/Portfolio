'use client'

/* Koppelt de run aan de demo eronder: haalt de run z'n release, dan gaat het
   scherm van het slot. Dit zat eerder aan een CustomEvent op document. */

import { useDemo } from '@/components/demo/demo-context'
import { RunLog } from './run-log'

export function RunLogSlot() {
  const { unlock } = useDemo()
  return <RunLog onComplete={unlock} />
}
