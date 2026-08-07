// De App Router bundelt intern al een React-build met <ViewTransition> en
// addTransitionType (zie components/directional-transition.tsx) — dat zijn
// canary-only APIs, en @types/react zet hun typen apart in react/canary in
// plaats van in de gewone index.d.ts. Deze reference laadt ze erbij zonder
// dat er ergens een echte import naar de niet-bestaande module 'react/canary'
// hoeft te staan.
/// <reference types="react/canary" />
