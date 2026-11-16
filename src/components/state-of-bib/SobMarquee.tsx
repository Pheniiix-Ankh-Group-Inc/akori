import type { SobCity } from "./types"

export function SobMarquee({ cities }: { cities: SobCity[] }) {
  const names = cities.slice(0, 8).map(c => c.city)
  const doubled = [...names, ...names]
  return (
    <div className="sob-marquee" aria-hidden>
      <div className="sob-marquee-inner">
        {doubled.map((name, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: "48px" }}>
            <span>{name}</span>
            <span className="dot" />
          </span>
        ))}
      </div>
    </div>
  )
}
