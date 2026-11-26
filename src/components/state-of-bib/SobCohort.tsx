"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { useLocale, useTranslations } from "next-intl"
import type { SobCohort as SobCohortData } from "./types"
import { COHORT_KEYS, cohortSeries, type CohortKey } from "@/lib/sob/explore"
import { useSobExplorer } from "./SobExplorer"
import { useMonthLabel } from "./SobEcosystems"

const PALETTE: Record<CohortKey, string> = { devs_0_1y: "#D9C49A", devs_1_2y: "#8A6A2F", devs_2y_plus: "#141414" }

type Labels = Record<CohortKey, { short: string; name: string }>

/**
 * Développeurs actifs par ancienneté : catégories activables, affichage en
 * effectifs ou en parts, lecture mois par mois (survol ou clavier), mise en
 * évidence d'une série. Un mois sans valeur reste un trou dans l'aire : rien
 * n'est interpolé.
 */
export function SobCohort({ cohort, labels }: { cohort: SobCohortData; labels: Labels }) {
  const t = useTranslations("SobExplore.cohort")
  const locale = useLocale()
  const monthLabel = useMonthLabel()
  const { filters, update, reducedMotion } = useSobExplorer()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(820)
  const [cursor, setCursor] = useState<number | null>(null)
  const [focusKey, setFocusKey] = useState<CohortKey | null>(null)
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const pf = useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }), [locale])

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const points = useMemo(() => cohortSeries(cohort, filters), [cohort, filters])
  const keys = COHORT_KEYS.filter((k) => filters.cohorts.includes(k))
  const share = filters.cohortMode === "share"
  const H = width < 560 ? 300 : 420
  const m = { top: 10, right: 16, bottom: 36, left: 52 }

  type Row = { i: number } & Record<CohortKey, number>
  // Un mois où une catégorie affichée manque devient un trou (NaN), jamais 0.
  const rows: Row[] = points.map((p, i) => {
    const missing = keys.some((k) => p.values[k] === null)
    const total = p.total ?? 0
    const r = { i } as Row
    for (const k of keys) {
      r[k] = missing ? NaN : share ? (total > 0 ? (p.values[k] as number) / total : 0) : (p.values[k] as number)
    }
    return r
  })
  const stacked = d3.stack<Row>().keys(keys)(rows)
  const x = d3.scaleLinear().domain([0, Math.max(1, points.length - 1)]).range([m.left, width - m.right])
  const yMax = share ? 1 : (d3.max(stacked.at(-1) ?? [], (d) => (Number.isFinite(d[1]) ? d[1] : 0)) || 1)
  const y = d3.scaleLinear().domain([0, yMax * (share ? 1 : 1.04)]).nice().range([H - m.bottom, m.top])
  // Annotation : le mois où la pile affichée culmine (calculé, jamais saisi).
  const peak = (() => {
    const last = stacked.at(-1)
    if (!last || share) return null
    let best: { i: number; top: number } | null = null
    last.forEach((d, i) => { if (Number.isFinite(d[1]) && (!best || d[1] > best.top)) best = { i, top: d[1] } })
    return best as { i: number; top: number } | null
  })()
  const area = d3
    .area<d3.SeriesPoint<Row>>()
    .defined((d) => Number.isFinite(d[0]) && Number.isFinite(d[1]))
    .x((d) => x(d.data.i))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(d3.curveMonotoneX)

  const onMove = (ev: React.PointerEvent<SVGRectElement>) => {
    const r = ev.currentTarget.getBoundingClientRect()
    const px = ((ev.clientX - r.left) / r.width) * (width - m.left - m.right) + m.left
    setCursor(Math.max(0, Math.min(points.length - 1, Math.round(x.invert(px)))))
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return
    e.preventDefault()
    setCursor((c) => {
      const cur = c ?? points.length - 1
      if (e.key === "Home") return 0
      if (e.key === "End") return points.length - 1
      return Math.max(0, Math.min(points.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1)))
    })
  }
  const toggle = (k: CohortKey) => {
    const on = filters.cohorts.includes(k)
    // Au moins une catégorie reste affichée.
    if (on && filters.cohorts.length === 1) return
    update({ cohorts: on ? filters.cohorts.filter((c) => c !== k) : COHORT_KEYS.filter((c) => c === k || filters.cohorts.includes(c)) })
  }

  const ticks = x.ticks(width < 560 ? 4 : 8).filter((v) => Number.isInteger(v))
  const p = cursor !== null ? points[cursor] : null

  return (
    <div className="sob-cohort" ref={wrapRef}>
      <div className="sob-chart-head">
        <fieldset className="sob-toggles">
          <legend className="sob-aside-title">{t("show")}</legend>
          {COHORT_KEYS.map((k) => {
            const on = filters.cohorts.includes(k)
            return (
              <button
                key={k}
                type="button"
                className="sob-toggle"
                aria-pressed={on}
                onClick={() => toggle(k)}
                onPointerEnter={() => setFocusKey(k)}
                onPointerLeave={() => setFocusKey(null)}
                onFocus={() => setFocusKey(k)}
                onBlur={() => setFocusKey(null)}
              >
                <span className="sob-cohort-legend-swatch" style={{ background: on ? PALETTE[k] : "transparent", borderColor: PALETTE[k] }} />
                {labels[k].short} · <b>{labels[k].name}</b>
              </button>
            )
          })}
        </fieldset>
        <span role="group" aria-label={t("mode")} className="sob-seg">
          <button type="button" aria-pressed={!share} onClick={() => update({ cohortMode: "count" })}>{t("count")}</button>
          <button type="button" aria-pressed={share} onClick={() => update({ cohortMode: "share" })}>{t("share")}</button>
        </span>
      </div>
      <p className="ed-muted sob-chart-hint">{t("hint")}</p>
      <div className="sob-chart-stage">
        <svg className="sob-cohort-svg" viewBox={`0 0 ${width} ${H}`} width="100%" height={H} role="img" aria-label={t("label")} tabIndex={0} onKeyDown={onKey}>
          <g className="axis" aria-hidden="true">
            {y.ticks(5).map((v) => (
              <g key={v} transform={`translate(0,${y(v)})`}>
                <line x1={m.left} x2={width - m.right} className="sob-grid" />
                <text x={m.left - 8} dy="0.32em" textAnchor="end">{share ? pf.format(v) : nf.format(v)}</text>
              </g>
            ))}
            {ticks.map((i) => (
              <text key={i} x={x(i)} y={H - m.bottom + 18} textAnchor="middle">{points[i] ? monthLabel(points[i].month) : ""}</text>
            ))}
          </g>
          {/* Couches révélées de bas en haut à chaque nouvelle sélection ; le passage effectifs ↔ parts
              fait glisser les aires (transition CSS de « d ») au lieu de les redessiner. */}
          <g className={reducedMotion ? undefined : "sob-layers"} key={`${keys.join()}-${filters.from}-${filters.to}`}>
            {stacked.map((s, li) => (
              <path
                key={s.key}
                d={area(s) ?? ""}
                style={{ d: `path("${area(s) ?? ""}")`, animationDelay: `${li * 140}ms` } as React.CSSProperties}
                fill={PALETTE[s.key as CohortKey]}
                fillOpacity={focusKey && focusKey !== s.key ? 0.25 : 0.9}
                className="sob-area sob-morph"
              />
            ))}
          </g>
          {peak && (
            <g className={reducedMotion ? "sob-annot" : "sob-annot sob-annot-in"} aria-hidden="true">
              <line x1={x(peak.i)} x2={x(peak.i)} y1={y(peak.top)} y2={m.top + 2} className="sob-annot-line" />
              <text x={x(peak.i)} y={m.top + 12} dx={x(peak.i) > width * 0.7 ? -6 : 6} textAnchor={x(peak.i) > width * 0.7 ? "end" : "start"}>
                {t("peak", { month: monthLabel(points[peak.i].month), value: share ? pf.format(peak.top) : nf.format(peak.top) })}
              </text>
            </g>
          )}
          {cursor !== null && <line className="sob-cursor" x1={x(cursor)} x2={x(cursor)} y1={m.top} y2={H - m.bottom} />}
          <rect x={m.left} y={m.top} width={Math.max(0, width - m.left - m.right)} height={Math.max(0, H - m.top - m.bottom)} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setCursor(null)} />
        </svg>
        {p && (
          <div className="sob-chart-readout" role="status" aria-live="polite">
            <b>{monthLabel(p.month)}</b>
            <ul>
              {COHORT_KEYS.filter((k) => filters.cohorts.includes(k)).map((k) => (
                <li key={k} className={focusKey === k ? "is-current" : undefined}>
                  <span>{labels[k].name}</span>
                  <span>
                    {p.values[k] === null ? "—" : nf.format(p.values[k] as number)}
                    {p.values[k] !== null && p.total ? ` · ${pf.format((p.values[k] as number) / p.total)}` : ""}
                  </span>
                </li>
              ))}
              <li><span>{t("total")}</span><span>{p.total === null ? "—" : nf.format(p.total)}</span></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
