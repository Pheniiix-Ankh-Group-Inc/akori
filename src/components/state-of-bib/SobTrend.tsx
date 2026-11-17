import type { SobTrendPoint } from "@/lib/sob/load"

/**
 * Série historique réelle d'un indicateur (une observation par version
 * publiée). Aucun point interpolé ni estimé : avec moins de deux versions,
 * seul le tableau est affiché.
 */
export function SobTrend({ points, locale, label, emptyNote }: { points: SobTrendPoint[]; locale: string; label: string; emptyNote: string }) {
  const nf = new Intl.NumberFormat(locale)
  const df = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" })
  const fmtDate = (d: string) => df.format(new Date(`${d}T00:00:00Z`))
  if (points.length === 0) return <p className="ed-note">{emptyNote}</p>

  const W = 720
  const H = 220
  const P = { l: 64, r: 16, t: 16, b: 32 }
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || Math.max(1, max * 0.1)
  const lo = Math.max(0, min - span * 0.15)
  const hi = max + span * 0.15
  const t0 = Date.parse(points[0].as_of_date)
  const t1 = Date.parse(points[points.length - 1].as_of_date)
  const x = (d: string) => (t1 === t0 ? P.l + (W - P.l - P.r) / 2 : P.l + ((Date.parse(d) - t0) / (t1 - t0)) * (W - P.l - P.r))
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b)
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.as_of_date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")
  const ticks = [lo, (lo + hi) / 2, hi]

  return (
    <figure className="sob-trend">
      {points.length >= 2 && (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="sob-trend-svg">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="sob-trend-grid" />
              <text x={P.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="sob-trend-tick">{nf.format(Math.round(v))}</text>
            </g>
          ))}
          <path d={path} className="sob-trend-line" />
          {points.map((p) => (
            <circle key={p.as_of_date} cx={x(p.as_of_date)} cy={y(p.value)} r={4} className="sob-trend-dot">
              <title>{`${fmtDate(p.as_of_date)} : ${nf.format(p.value)}`}</title>
            </circle>
          ))}
          <text x={P.l} y={H - 8} className="sob-trend-tick">{fmtDate(points[0].as_of_date)}</text>
          <text x={W - P.r} y={H - 8} textAnchor="end" className="sob-trend-tick">{fmtDate(points[points.length - 1].as_of_date)}</text>
        </svg>
      )}
      {points.length < 2 && <p className="ed-note">{emptyNote}</p>}
      <table className="sob-trend-table">
        <caption className="sr-only">{label}</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">{label}</th></tr></thead>
        <tbody>
          {points.map((p) => <tr key={p.as_of_date}><td>{fmtDate(p.as_of_date)}</td><td>{nf.format(p.value)}</td></tr>)}
        </tbody>
      </table>
    </figure>
  )
}
