import type { SobDelta } from "@/lib/sob/history"

/**
 * Écarts avec la version précédente, en barres divergentes autour de zéro.
 * Hausse à droite (or), baisse à gauche (ivoire cerné), nouvelle ou
 * disparue signalée en toutes lettres. La forme suit aussi le signe (pas la
 * couleur seule) et le tableau reste lisible sans les barres.
 */
export function DeltaBars({ deltas, locale, labels }: {
  deltas: SobDelta[]
  locale: string
  labels: { metric: string; previous: string; current: string; change: string; added: string; removed: string; unknown: string; caption: string }
}) {
  const nf = new Intl.NumberFormat(locale)
  const pf = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" })
  const maxRel = Math.max(0.0001, ...deltas.map((d) => Math.abs(d.relative_change ?? 0)))
  return (
    <table className="sob-delta">
      <caption className="sr-only">{labels.caption}</caption>
      <thead>
        <tr>
          <th scope="col">{labels.metric}</th>
          <th scope="col">{labels.previous}</th>
          <th scope="col">{labels.current}</th>
          <th scope="col">{labels.change}</th>
        </tr>
      </thead>
      <tbody>
        {deltas.map((d) => {
          const rel = d.relative_change
          const kind = d.change_kind === "added" ? labels.added : d.change_kind === "removed" ? labels.removed : null
          const w = rel == null ? 0 : (Math.abs(rel) / maxRel) * 50
          return (
            <tr key={d.metric_key}>
              <th scope="row">{d.metric_key.replaceAll("_", " ")}</th>
              <td>{d.previous_value == null ? "—" : nf.format(d.previous_value)}</td>
              <td>{d.current_value == null ? "—" : nf.format(d.current_value)}</td>
              <td>
                <span className="sob-delta-track" aria-hidden="true">
                  {rel != null && (
                    <span className={rel >= 0 ? "sob-delta-bar up im-bar" : "sob-delta-bar down"} style={rel >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }} />
                  )}
                </span>
                <span className="sob-delta-val">
                  {kind ?? (d.delta == null ? labels.unknown : `${d.delta > 0 ? "+" : ""}${nf.format(d.delta)}${rel != null ? ` (${pf.format(rel)})` : ""}`)}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
