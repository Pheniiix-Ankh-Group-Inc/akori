"use client"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { useLocale, useTranslations } from "next-intl"
import type { SobEcosystem } from "./types"
import { ECO_SORTS, monthRange, rankEcosystems, type EcoRow } from "@/lib/sob/explore"
import { useSobExplorer } from "./SobExplorer"

const INK = "#141414"
const GOLD = "#8A6A2F"
const MUTED = "#CFC8BC"

function useWidth<T extends HTMLElement>(fallback: number): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

export function useMonthLabel() {
  const locale = useLocale()
  return useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" })
    return (m: string) => f.format(new Date(`${m}-01T00:00:00Z`))
  }, [locale])
}

/** Écosystèmes : courbes temporelles interactives puis classement dynamique. */
export function SobEcosystems({ ecosystems, months }: { ecosystems: SobEcosystem[]; months: string[] }) {
  return (
    <div className="sob-eco">
      <EcoTimeline ecosystems={ecosystems} months={months} />
      <EcoRanking ecosystems={ecosystems} months={months} />
    </div>
  )
}

function EcoTimeline({ ecosystems, months }: { ecosystems: SobEcosystem[]; months: string[] }) {
  const t = useTranslations("SobExplore")
  const locale = useLocale()
  const monthLabel = useMonthLabel()
  const { filters, update, reducedMotion } = useSobExplorer()
  const [wrapRef, width] = useWidth<HTMLDivElement>(820)
  const [mode, setMode] = useState<"absolute" | "indexed">("absolute")
  const [cursor, setCursor] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const brushRef = useRef<SVGGElement>(null)
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale])

  const H = width < 560 ? 280 : 340
  const narrow = width < 560
  const m = { top: 16, right: narrow ? 16 : 96, bottom: 56, left: 48 }
  const [i0, i1] = monthRange(months, filters.from, filters.to)
  const shown = useMemo(() => months.slice(i0, i1 + 1), [months, i0, i1])
  const cursorRef = useRef<number | null>(null)
  useEffect(() => {
    cursorRef.current = cursor
  }, [cursor])

  const series = useMemo(
    () =>
      ecosystems.map((e) => {
        const raw = (e.series_devs ?? []).slice(i0, i1 + 1).map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null))
        const base = raw.find((v) => v !== null && v > 0) ?? null
        const values = mode === "indexed" ? raw.map((v) => (v !== null && base ? (v / base) * 100 : null)) : raw
        return { id: e.id, name: e.name, raw, values }
      }),
    [ecosystems, i0, i1, mode],
  )

  const x = useMemo(() => d3.scalePoint<number>().domain(d3.range(shown.length)).range([m.left, width - m.right]), [shown.length, width, m.left, m.right])
  const yMax = d3.max(series.flatMap((s) => s.values.filter((v): v is number => v !== null))) ?? 1
  const y = useMemo(() => d3.scaleLinear().domain([0, yMax * 1.05]).nice().range([H - m.bottom, m.top]), [yMax, H, m.bottom, m.top])
  const line = d3
    .line<number | null>()
    .defined((v) => v !== null)
    .x((_, i) => x(i) ?? 0)
    .y((v) => y(v as number))
    .curve(d3.curveMonotoneX)

  // Lecture / pause : parcours mois par mois sur la période.
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const c = cursorRef.current
      const next = c === null ? 0 : c + 1
      if (next >= shown.length) {
        setPlaying(false)
        return
      }
      setCursor(next)
    }, reducedMotion ? 900 : 450)
    return () => window.clearInterval(id)
  }, [playing, shown.length, reducedMotion])

  // Sélection d'une plage temporelle par glissement (brush), alignée sur les mois.
  useEffect(() => {
    const g = brushRef.current
    if (!g || shown.length < 2) return
    const brush = d3
      .brushX()
      .extent([[m.left, H - m.bottom + 22], [width - m.right, H - m.bottom + 44]])
      .on("end", (ev: d3.D3BrushEvent<unknown>) => {
        if (!ev.sourceEvent || !ev.selection) return
        const [a, b] = ev.selection as [number, number]
        const step = x.step()
        const ia = Math.max(0, Math.round((a - m.left) / step))
        const ib = Math.min(shown.length - 1, Math.round((b - m.left) / step))
        d3.select(g).call(brush.move, null)
        if (ib > ia) update({ from: shown[ia] === months[0] ? null : shown[ia], to: shown[ib] === months[months.length - 1] ? null : shown[ib] })
      })
    d3.select(g).call(brush)
    return () => {
      d3.select(g).on(".brush", null).selectAll("*").remove()
    }
  }, [width, H, shown, months, x, update, m.left, m.right, m.bottom])

  const onMove = (ev: React.PointerEvent<SVGRectElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect()
    const px = ((ev.clientX - rect.left) / rect.width) * (width - m.left - m.right) + m.left
    const idx = Math.round((px - m.left) / x.step())
    setCursor(Math.max(0, Math.min(shown.length - 1, idx)))
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return
    e.preventDefault()
    setPlaying(false)
    setCursor((c) => {
      const cur = c ?? shown.length - 1
      if (e.key === "Home") return 0
      if (e.key === "End") return shown.length - 1
      return Math.max(0, Math.min(shown.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1)))
    })
  }

  const highlighted = filters.ecosystem
  // Étiquettes en bout de courbe (dernière valeur observée), écartées pour rester lisibles.
  const endLabels = narrow
    ? []
    : (() => {
        const items = series
          .map((s) => {
            let k = s.values.length - 1
            while (k >= 0 && s.values[k] === null) k--
            return k >= 0 ? { id: s.id, name: s.name, y: y(s.values[k] as number) } : null
          })
          .filter((v): v is { id: number; name: string; y: number } => v !== null)
          .sort((a, b) => a.y - b.y)
        for (let k = 1; k < items.length; k++) if (items[k].y - items[k - 1].y < 13) items[k].y = items[k - 1].y + 13
        return items
      })()
  const atCursor = cursor !== null
    ? series
        .map((s) => ({ s, v: s.values[cursor], raw: s.raw[cursor] }))
        .sort((a, b) => (b.v ?? -1) - (a.v ?? -1))
    : []
  const ticks = x.domain().filter((_, i, arr) => i % Math.max(1, Math.ceil(arr.length / (width < 560 ? 4 : 8))) === 0)
  // Le tracé se redessine quand la période change ; un changement de mode
  // (valeurs absolues ↔ base 100) fait glisser les courbes d'une échelle à
  // l'autre (transition CSS de « d », interrompue proprement par la suivante).
  const animKey = `${i0}-${i1}`

  return (
    <figure className="sob-chart" ref={wrapRef}>
      <figcaption className="sob-chart-head">
        <span className="sob-aside-title">{t("timeline.title")}</span>
        <span className="sob-chart-tools">
          <span role="group" aria-label={t("timeline.title")} className="sob-seg">
            <button type="button" aria-pressed={mode === "absolute"} onClick={() => setMode("absolute")}>{t("timeline.absolute")}</button>
            <button type="button" aria-pressed={mode === "indexed"} onClick={() => setMode("indexed")}>{t("timeline.indexed")}</button>
          </span>
          <button type="button" className="sob-icon-btn sob-icon-btn-wide" onClick={() => { if (!playing && (cursor === null || cursor >= shown.length - 1)) setCursor(0); setPlaying((p) => !p) }} aria-pressed={playing}>
            {playing ? t("timeline.pause") : t("timeline.play")}
          </button>
          <button type="button" className="sob-icon-btn sob-icon-btn-wide" onClick={() => { setPlaying(false); setCursor(0) }} disabled={shown.length < 2}>
            {t("timeline.restart")}
          </button>
        </span>
      </figcaption>
      <p className="ed-muted sob-chart-hint">{t("timeline.hint")}</p>
      <div className="sob-chart-stage">
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${H}`}
          role="img"
          aria-label={t("timeline.label")}
          tabIndex={0}
          onKeyDown={onKey}
          className="sob-timeline-svg"
        >
          <g className="axis" aria-hidden="true">
            {y.ticks(5).map((v) => (
              <g key={v} className="sob-tick" style={{ transform: `translateY(${y(v)}px)` }}>
                <line x1={m.left} x2={width - m.right} className="sob-grid" />
                <text x={m.left - 8} dy="0.32em" textAnchor="end">{nf.format(v)}</text>
              </g>
            ))}
            {ticks.map((i) => (
              <text key={i} x={x(i)} y={H - m.bottom + 16} textAnchor="middle">{monthLabel(shown[i])}</text>
            ))}
          </g>
          <g key={animKey} className={reducedMotion ? undefined : "sob-draw"}>
            {series.map((s) => {
              const isHi = highlighted === s.id
              const dim = highlighted !== null && !isHi
              return (
                <path
                  key={s.id}
                  d={line(s.values) ?? ""}
                  style={{ d: `path("${line(s.values) ?? ""}")` } as React.CSSProperties}
                  pathLength={1}
                  fill="none"
                  stroke={isHi ? GOLD : dim ? MUTED : INK}
                  strokeWidth={isHi ? 2.75 : 1.25}
                  strokeOpacity={dim ? 0.8 : isHi ? 1 : 0.55}
                  className="sob-line"
                />
              )
            })}
          </g>
          <g aria-hidden="true" className="sob-end-labels">
            {endLabels.map((l) => (
              <text key={l.id} x={width - m.right + 8} y={l.y} dy="0.32em" className={highlighted === l.id ? "is-current" : highlighted !== null ? "is-dim" : undefined}>
                {l.name}
              </text>
            ))}
          </g>
          {cursor !== null && (
            <g aria-hidden="true">
              <line x1={x(cursor)} x2={x(cursor)} y1={m.top} y2={H - m.bottom} className="sob-cursor" />
              {series.map((s) => (s.values[cursor] !== null ? (
                <circle key={s.id} cx={x(cursor)} cy={y(s.values[cursor] as number)} r={highlighted === s.id ? 4.5 : 3} fill={highlighted === s.id ? GOLD : INK} />
              ) : null))}
            </g>
          )}
          <rect
            x={m.left}
            y={m.top}
            width={Math.max(0, width - m.left - m.right)}
            height={Math.max(0, H - m.top - m.bottom)}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => !playing && setCursor(null)}
          />
          <g ref={brushRef} className="sob-brush" />
        </svg>
        {cursor !== null && (
          <div className="sob-chart-readout" role="status" aria-live="polite">
            <b>{monthLabel(shown[cursor])}</b>
            <ul>
              {atCursor.map(({ s, v, raw }) => (
                <li key={s.id} className={highlighted === s.id ? "is-current" : undefined}>
                  <span>{s.name}</span>
                  <span>{v === null ? t("ranking.na") : mode === "indexed" ? `${nf.format(Math.round(v))} · ${t("timeline.value", { value: nf.format(raw as number) })}` : t("timeline.value", { value: nf.format(v) })}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </figure>
  )
}

function Sparkline({ row, months, label }: { row: EcoRow; months: string[]; label: (m: string) => string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 240
  const H = 72
  const values = row.series
  const present = values.filter((v): v is number => v !== null)
  const x = d3.scaleLinear().domain([0, Math.max(1, values.length - 1)]).range([2, W - 2])
  const lo = d3.min(present) ?? 0
  const hi = d3.max(present) ?? 1
  const y = d3.scaleLinear().domain([lo * 0.95, hi === lo ? hi + 1 : hi * 1.05]).range([H - 4, 4])
  const line = d3.line<number | null>().defined((v) => v !== null).x((_, i) => x(i)).y((v) => y(v as number)).curve(d3.curveMonotoneX)
  const area = d3.area<number | null>().defined((v) => v !== null).x((_, i) => x(i)).y0(H).y1((v) => y(v as number)).curve(d3.curveMonotoneX)
  const last = values.length - 1
  return (
    <div className="sob-spark-wrap">
      <svg
        className="sob-eco-spark"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setHover(Math.max(0, Math.min(last, Math.round(((e.clientX - r.left) / r.width) * last))))
        }}
        onPointerLeave={() => setHover(null)}
      >
        <path className="area" d={area(values) ?? ""} />
        <path className="line" d={line(values) ?? ""} />
        {hover !== null && values[hover] !== null && (
          <>
            <line className="baseline" x1={x(hover)} x2={x(hover)} y1={0} y2={H} />
            <circle r={3} cx={x(hover)} cy={y(values[hover] as number)} />
          </>
        )}
      </svg>
      {hover !== null && (
        <span className="sob-spark-tip">
          {label(months[hover])} · {values[hover] === null ? "—" : values[hover]}
        </span>
      )}
    </div>
  )
}

function EcoRanking({ ecosystems, months }: { ecosystems: SobEcosystem[]; months: string[] }) {
  const t = useTranslations("SobExplore")
  const locale = useLocale()
  const monthLabel = useMonthLabel()
  const { filters, update, reducedMotion } = useSobExplorer()
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const pf = useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }), [locale])
  const sf = useMemo(() => new Intl.NumberFormat(locale, { signDisplay: "exceptZero" }), [locale])
  const rows = useMemo(() => rankEcosystems(ecosystems, months, filters), [ecosystems, months, filters])
  const [i0, i1] = monthRange(months, filters.from, filters.to)
  const shown = useMemo(() => months.slice(i0, i1 + 1), [months, i0, i1])

  // Animation FLIP des changements de classement.
  const gridRef = useRef<HTMLOListElement>(null)
  const prev = useRef<Map<string, DOMRect>>(new Map())
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const items = [...grid.querySelectorAll<HTMLElement>("[data-eco]")]
    const next = new Map(items.map((el) => [el.dataset.eco as string, el.getBoundingClientRect()]))
    if (!reducedMotion) {
      for (const el of items) {
        const before = prev.current.get(el.dataset.eco as string)
        const after = next.get(el.dataset.eco as string)
        if (!before || !after) continue
        const dx = before.left - after.left
        const dy = before.top - after.top
        if (dx || dy) {
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.7,.2,1)" })
        }
      }
    }
    prev.current = next
  }, [rows, reducedMotion])

  return (
    <div className="sob-ranking">
      <div className="sob-ranking-head">
        <label className="sob-control">
          <span>{t("ranking.sortBy")}</span>
          <select className="ed-input" value={filters.ecoSort} onChange={(e) => update({ ecoSort: e.target.value as typeof filters.ecoSort })}>
            {ECO_SORTS.map((s) => <option key={s} value={s}>{t(`ranking.sorts.${s}`)}</option>)}
          </select>
        </label>
        <span className="sr-only" aria-live="polite">
          {filters.ecosystem !== null ? t("ranking.highlighted", { name: rows.find((r) => r.id === filters.ecosystem)?.name ?? "" }) : ""}
        </span>
      </div>
      <ol className="sob-eco-grid" ref={gridRef}>
        {rows.map((r, i) => {
          const isHi = filters.ecosystem === r.id
          const down = (r.growthAbs ?? 0) < 0
          return (
            <li key={r.id} data-eco={r.id} className={`sob-eco-card${isHi ? " is-current" : ""}`}>
              <button type="button" className="sob-eco-select" aria-pressed={isHi} title={t("ranking.select", { name: r.name })} onClick={() => update({ ecosystem: isHi ? null : r.id })}>
                <span className="sob-eco-rank">{String(i + 1).padStart(2, "0")}</span>
                <span className="sob-eco-name">{r.name}<em>.</em></span>
                <span className="sob-eco-devs"><b>{nf.format(r.devsRecent)}</b> {t("filters.metrics.devs_active_28d")}</span>
              </button>
              <Sparkline row={r} months={shown} label={monthLabel} />
              <div className="sob-eco-change">
                <span>
                  {r.first !== null && r.last !== null ? t("ranking.period", { first: nf.format(r.first), last: nf.format(r.last) }) : t("ranking.na")}
                </span>
                <b className={down ? "down" : ""}>
                  {r.growthAbs === null ? t("ranking.na") : sf.format(r.growthAbs)}
                  {r.growthRel !== null && <> · {pf.format(r.growthRel)}</>}
                </b>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
