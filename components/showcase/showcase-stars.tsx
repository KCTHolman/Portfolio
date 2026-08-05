import type { CSSProperties } from 'react'

/* De sterrenhemel achter de showcase. Puur decoratief; de posities staan vast
   zodat het beeld niet per bezoek verspringt. */

const STARS = [
  { y: '12%', x: '8%', s: '3px', o: 0.4 },
  { y: '6%', x: '19%', s: '4px', o: 0.45 },
  { y: '22%', x: '31%', s: '2px', o: 0.3 },
  { y: '9%', x: '47%', s: '5px', o: 0.5 },
  { y: '17%', x: '63%', s: '3px', o: 0.3 },
  { y: '5%', x: '75%', s: '3px', o: 0.4 },
  { y: '21%', x: '89%', s: '2px', o: 0.3 },
  { y: '55%', x: '10%', s: '3px', o: 0.3 },
  { y: '78%', x: '24%', s: '2px', o: 0.32 },
  { y: '68%', x: '58%', s: '4px', o: 0.4 },
  { y: '60%', x: '80%', s: '2px', o: 0.3 },
  { y: '85%', x: '92%', s: '3px', o: 0.35 },
]

export function ShowcaseStars() {
  return (
    <div className="dsv-stars" aria-hidden="true">
      {STARS.map((star) => (
        <span
          key={`${star.x}-${star.y}`}
          style={{ '--y': star.y, '--x': star.x, '--s': star.s, '--o': star.o } as CSSProperties}
        />
      ))}
    </div>
  )
}
