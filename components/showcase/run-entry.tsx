import type { Ref } from 'react'

import type { RunStep } from './run-data'

/* Eén regel uit het logboek. De data-attributen die overblijven zijn puur
   CSS-haken — widget.css hangt aan data-shown, data-last, data-waiting,
   data-gate en data-who. */

type RunEntryProps = {
  step: RunStep
  shown: boolean
  last: boolean
  waiting: boolean
  onApprove: () => void
  ref?: Ref<HTMLLIElement>
}

export function RunEntry({ step, shown, last, waiting, onApprove, ref }: RunEntryProps) {
  return (
    <li
      ref={ref}
      className="dsv-entry"
      data-who={step.who}
      {...(step.gate ? { 'data-gate': '' } : {})}
      {...(shown ? { 'data-shown': '' } : {})}
      {...(last ? { 'data-last': '' } : {})}
      {...(step.gate && last && waiting ? { 'data-waiting': '' } : {})}
    >
      <div className="dsv-entry-head">
        <span className="dsv-entry-t">{step.t}</span>
        <span className="dsv-entry-who">{step.who}</span>
        <span className="dsv-entry-title">{step.title}</span>
      </div>

      <p className="dsv-entry-detail">{step.detail}</p>
      {step.extra}

      {step.tech ? (
        <p className="dsv-entry-tech">
          <span className="dsv-tech-label">backend</span>
          {step.tech}
        </p>
      ) : null}

      {step.fail ? (
        <p className="dsv-entry-fail">
          <span className="dsv-fail-label">als het misgaat</span>
          {step.fail}
        </p>
      ) : null}

      {step.gate ? (
        <div className="dsv-entry-act">
          <button type="button" className="dsv-approve" onClick={onApprove}>
            Goedkeuren &rarr;
          </button>
          <span className="dsv-entry-wait">de pijplijn staat stil tot je klikt</span>
        </div>
      ) : null}
    </li>
  )
}
