"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"
import { useLocale, useTranslations } from "next-intl"
import type { SobCountry } from "./types"
import { renderSafe } from "@/lib/dom/safe"
import { colorDomain, countryStats, type CountryStats, type Metric, type SobFilters } from "@/lib/sob/explore"
import { useSobExplorer } from "./SobExplorer"

const ISO_NUM_TO_A3: Record<string, string> = {
  "012": "DZA", "024": "AGO", "204": "BEN", "072": "BWA", "854": "BFA", "108": "BDI", "132": "CPV", "120": "CMR",
  "140": "CAF", "148": "TCD", "174": "COM", "178": "COG", "180": "COD", "384": "CIV", "262": "DJI", "818": "EGY",
  "226": "GNQ", "232": "ERI", "748": "SWZ", "231": "ETH", "266": "GAB", "270": "GMB", "288": "GHA", "324": "GIN",
  "624": "GNB", "404": "KEN", "426": "LSO", "430": "LBR", "434": "LBY", "450": "MDG", "454": "MWI", "466": "MLI",
  "478": "MRT", "480": "MUS", "504": "MAR", "508": "MOZ", "516": "NAM", "562": "NER", "566": "NGA", "646": "RWA",
  "678": "STP", "686": "SEN", "690": "SYC", "694": "SLE", "706": "SOM", "710": "ZAF", "728": "SSD", "729": "SDN",
  "834": "TZA", "768": "TGO", "788": "TUN", "800": "UGA", "894": "ZMB", "716": "ZWE",
  "028": "ATG", "044": "BHS", "052": "BRB", "084": "BLZ", "192": "CUB", "212": "DMA", "214": "DOM", "308": "GRD",
  "328": "GUY", "332": "HTI", "388": "JAM", "659": "KNA", "662": "LCA", "670": "VCT", "740": "SUR", "780": "TTO",
  "630": "PRI", "312": "GLP", "474": "MTQ", "533": "ABW", "531": "CUW", "500": "MSR",
}
const SCOPE_A3 = new Set(Object.values(ISO_NUM_TO_A3))
const W = 900
const H = 620
const NO_DATA = "#E4DFD6"
const INTERPOLATE = d3.interpolateLab("#F2EDE4", "#5E4619")

type Feat = GeoJSON.Feature & { id: string; iso: string }

/**
 * Carte choroplèthe interactive (Afrique + Caraïbes) : zoom et déplacement,
 * sélection au clic, au toucher ou depuis la liste, mise en évidence animée,
 * changement de métrique, panneau de détails et comparaison de deux pays.
 * Le SVG est construit une seule fois ; les changements de filtres ne mettent
 * à jour que les attributs (couleurs, classes) des formes existantes.
 */
/** Filtres hors sélection de pays : leur changement interrompt la visite. */
function contextKey(f: SobFilters): string {
  return JSON.stringify({ ...f, country: null, compare: null })
}

export function SobMap({ map }: { map: SobCountry[] }) {
  const t = useTranslations("SobExplore")
  const locale = useLocale()
  const { filters, update, reducedMotion } = useSobExplorer()
  const svgRef = useRef<SVGSVGElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const pathRef = useRef<d3.GeoPath | null>(null)
  const featsRef = useRef<Map<string, Feat>>(new Map())
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const pf = useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }), [locale])
  const stats = useMemo(() => countryStats(map, filters), [map, filters])
  const domain = useMemo(() => colorDomain(stats), [stats])
  const color = useMemo(
    () => (domain ? d3.scaleSequentialLog(INTERPOLATE).domain(domain) : null),
    [domain],
  )
  const ranked = useMemo(
    () => [...stats.values()].filter((s) => s.rank !== null).sort((a, b) => (a.rank as number) - (b.rank as number)),
    [stats],
  )
  const metricLabel = t(`filters.metrics.${filters.metric}`)

  // Dernières valeurs lues par les gestionnaires d'événements D3 (pas de
  // re-liaison des écouteurs à chaque changement de filtre).
  const live = useRef({ stats, metric: filters.metric as Metric, nf, t, update })
  useEffect(() => {
    live.current = { stats, metric: filters.metric, nf, t, update }
  })

  // 1. Construction unique du SVG, du zoom et des écouteurs.
  useEffect(() => {
    const svgEl = svgRef.current
    const tipEl = tipRef.current
    const frameEl = frameRef.current
    if (!svgEl || !tipEl || !frameEl) return
    const controller = new AbortController()
    let raf = 0

    ;(async () => {
      try {
        const res = await fetch("/data/countries-110m.json", { signal: controller.signal })
        const world = await res.json()
        if (controller.signal.aborted) return
        const fc = feature(world, world.objects.countries) as unknown as { features: (GeoJSON.Feature & { id: string | number })[] }
        const all: Feat[] = fc.features.map((f) => ({ ...f, id: String(f.id), iso: ISO_NUM_TO_A3[String(f.id)] ?? "" }))
        const scoped = all.filter((f) => SCOPE_A3.has(f.iso))
        const others = all.filter((f) => !SCOPE_A3.has(f.iso))
        featsRef.current = new Map(scoped.map((f) => [f.iso, f]))

        const proj = d3.geoEqualEarth().fitExtent([[20, 20], [W - 20, H - 20]], { type: "FeatureCollection", features: scoped } as GeoJSON.FeatureCollection)
        const path = d3.geoPath(proj)
        pathRef.current = path

        const svg = d3.select(svgEl).attr("viewBox", `0 0 ${W} ${H}`)
        svg.selectAll("*").remove()
        const layer = svg.append("g").attr("class", "sob-zoom-layer")
        layer.append("g").attr("class", "bg").selectAll("path").data(others).join("path").attr("class", "country-bg").attr("d", (d) => path(d) ?? "")
        layer
          .append("g")
          .attr("class", "fg")
          .selectAll<SVGPathElement, Feat>("path")
          .data(scoped, (d) => d.iso)
          .join("path")
          .attr("class", "country")
          .attr("data-iso", (d) => d.iso)
          .attr("d", (d) => path(d) ?? "")
          .attr("fill", NO_DATA)
          .on("pointermove", (ev: PointerEvent, d) => {
            if (ev.pointerType === "touch") return
            cancelAnimationFrame(raf)
            const { clientX, clientY } = ev
            raf = requestAnimationFrame(() => {
              const { stats: s, metric, nf: fmt, t: tr } = live.current
              const st = s.get(d.iso)
              const box = frameEl.getBoundingClientRect()
              tipEl.style.left = `${Math.min(clientX - box.left + 14, box.width - 220)}px`
              tipEl.style.top = `${clientY - box.top + 14}px`
              tipEl.style.opacity = "1"
              renderSafe(tipEl, [
                { tag: "b", children: [st?.name ?? d.iso] },
                st && st.value !== null
                  ? `${fmt.format(st.value)} · ${tr(`filters.metrics.${metric}`)}`
                  : tr("map.noData"),
              ])
            })
          })
          .on("pointerleave", () => {
            cancelAnimationFrame(raf)
            tipEl.style.opacity = "0"
          })
          .on("click", (_ev, d) => {
            const st = live.current.stats.get(d.iso)
            if (st) live.current.update({ country: d.iso })
          })

        const zoom = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([1, 8])
          .translateExtent([[0, 0], [W, H]])
          .on("zoom", (ev) => {
            layer.attr("transform", ev.transform.toString())
            // Épaisseur de trait constante quel que soit le zoom.
            layer.style("--sob-stroke", String(0.6 / ev.transform.k))
          })
        svg.call(zoom).on("dblclick.zoom", null)
        zoomRef.current = zoom
        setReady(true)
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("SobMap:", err)
          setFailed(true)
        }
      }
    })()

    return () => {
      controller.abort()
      cancelAnimationFrame(raf)
      const svg = d3.select(svgEl)
      svg.on(".zoom", null)
      svg.selectAll("path").on("pointermove", null).on("pointerleave", null).on("click", null).interrupt()
      svg.interrupt()
    }
  }, [])

  // 2. Couleurs, région et sélection : mise à jour des attributs seulement.
  useEffect(() => {
    if (!ready || !svgRef.current) return
    const paths = d3.select(svgRef.current).selectAll<SVGPathElement, Feat>("path.country")
    const fill = (d: Feat) => {
      const st = stats.get(d.iso)
      return st && st.value !== null && st.value > 0 && color ? color(st.value) : NO_DATA
    }
    const duration = reducedMotion ? 0 : 450
    paths
      .classed("is-out", (d) => !stats.has(d.iso))
      .classed("is-selected", (d) => d.iso === filters.country)
      .classed("is-compare", (d) => d.iso === filters.compare)
      .interrupt()
      .transition()
      .duration(duration)
      .attr("fill", fill)
    paths.filter((d) => d.iso === filters.compare || d.iso === filters.country).raise()
    d3.select(svgRef.current).classed("has-selection", !!filters.country)
  }, [ready, stats, color, filters.country, filters.compare, reducedMotion])

  // 3. Zoom animé vers la sélection (ou retour à la vue d'ensemble).
  useEffect(() => {
    const svgEl = svgRef.current
    const zoom = zoomRef.current
    const path = pathRef.current
    if (!ready || !svgEl || !zoom || !path) return
    const isos = [filters.country, filters.compare].filter(Boolean) as string[]
    const feats = isos.map((i) => featsRef.current.get(i)).filter(Boolean) as Feat[]
    let target = d3.zoomIdentity
    if (feats.length) {
      const [[x0, y0], [x1, y1]] = path.bounds({ type: "FeatureCollection", features: feats } as GeoJSON.FeatureCollection)
      const k = Math.min(6, 0.8 / Math.max((x1 - x0) / W, (y1 - y0) / H))
      target = d3.zoomIdentity.translate(W / 2, H / 2).scale(Math.max(1, k)).translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
    }
    const svg = d3.select(svgEl)
    svg.interrupt()
    if (reducedMotion) svg.call(zoom.transform, target)
    else svg.transition().duration(650).ease(d3.easeCubicOut).call(zoom.transform, target)
  }, [ready, filters.country, filters.compare, reducedMotion])

  // 4. Entrée de la carte : les pays apparaissent dans l'ordre de leur rang,
  // une seule fois, quand la carte arrive à l'écran (désactivé si mouvement réduit).
  const entered = useRef(false)
  useEffect(() => {
    const svgEl = svgRef.current
    if (!ready || !svgEl || entered.current || reducedMotion || typeof IntersectionObserver === "undefined") return
    const order = new Map(ranked.map((r, i) => [r.iso, i]))
    d3.select(svgEl).selectAll<SVGPathElement, Feat>("path.country").style("--d", (d) => `${Math.min(900, (order.get(d.iso) ?? ranked.length) * 28)}ms`)
    svgEl.classList.add("is-entering")
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return
      io.disconnect()
      entered.current = true
      svgEl.classList.add("is-in")
      window.setTimeout(() => svgEl.classList.remove("is-entering", "is-in"), 1800)
    }, { threshold: 0.25 })
    io.observe(svgEl)
    return () => io.disconnect()
  }, [ready, ranked, reducedMotion])

  // 5. Visite guidée : les cinq premiers pays du périmètre, l'un après l'autre
  // (zoom et fiche à chaque étape). Lancée et arrêtée par le visiteur ;
  // jamais automatique, pas de lecture en continu.
  const candidates = useMemo(() => ranked.filter((r) => (r.value ?? 0) > 0).slice(0, 5).map((r) => ({ iso: r.iso, name: r.name })), [ranked])
  // Les étapes sont figées au lancement : la sélection d'un pays recalcule le
  // classement, qui ne doit pas relancer la visite.
  const [tourStops, setTourStops] = useState<{ iso: string; name: string }[]>([])
  const [tour, setTour] = useState<number | null>(null)
  // Contexte figé au lancement (métrique, région, période, écosystème…) et
  // pays que la visite elle-même a le droit de sélectionner.
  const tourContext = useRef<string>("")
  const tourAllowed = useRef<Set<string | null>>(new Set())
  const startTour = () => {
    tourContext.current = contextKey(filters)
    tourAllowed.current = new Set<string | null>([filters.country, ...candidates.map((c) => c.iso)])
    setTourStops(candidates)
    setTour(0)
  }
  /** Toute interaction manuelle reprend la main : la visite s'arrête. */
  const stopTour = () => setTour(null)
  // Changement de métrique, région, période ou version (remontage), ou
  // sélection d'un pays hors visite : arrêt immédiat.
  useEffect(() => {
    if (tour === null) return
    if (contextKey(filters) !== tourContext.current || !tourAllowed.current.has(filters.country)) {
      const id = window.setTimeout(() => setTour(null), 0)
      return () => window.clearTimeout(id)
    }
  }, [filters, tour])
  useEffect(() => {
    if (tour === null) return
    const stop = tourStops[tour]
    if (!stop) {
      const id = window.setTimeout(() => setTour(null), 0)
      return () => window.clearTimeout(id)
    }
    update({ country: stop.iso, compare: null })
    if (reducedMotion) return
    const id = window.setTimeout(() => setTour((k) => (k === null ? null : k + 1)), 3400)
    return () => window.clearTimeout(id)
  }, [tour, tourStops, update, reducedMotion])

  const zoomBy = (factor: number) => {
    const svgEl = svgRef.current
    if (!svgEl || !zoomRef.current) return
    const svg = d3.select(svgEl)
    if (reducedMotion) svg.call(zoomRef.current.scaleBy, factor)
    else svg.transition().duration(250).call(zoomRef.current.scaleBy, factor)
  }
  const resetView = () => update({ country: null, compare: null })
  const onKey = (e: React.KeyboardEvent) => {
    if (tour !== null && e.key !== "Tab" && e.key !== "Shift") stopTour()
    if (e.key === "+" || e.key === "=") zoomBy(1.5)
    else if (e.key === "-") zoomBy(1 / 1.5)
    else if (e.key === "0" || e.key === "Escape") {
      resetView()
      if (svgRef.current && zoomRef.current) d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity)
    } else return
    e.preventDefault()
  }

  const selected = filters.country ? stats.get(filters.country) ?? null : null
  const compared = filters.compare ? stats.get(filters.compare) ?? null : null
  const total = ranked.length

  const legendStops = useMemo(() => {
    if (!domain || !color) return []
    const [lo, hi] = domain.map(Math.log)
    return d3.range(8).map((i) => color(Math.exp(lo + (i / 7) * (hi - lo))))
  }, [domain, color])

  return (
    <div className="sob-map-frame" ref={frameRef}>
      <div className="sob-map-stage">
        {candidates.length > 1 && (
          <div className="sob-tour" role="group" aria-label={t("map.tour")}>
            <button type="button" className="sob-icon-btn sob-icon-btn-wide" aria-pressed={tour !== null} onClick={() => (tour === null ? startTour() : setTour((k) => (k === null ? null : reducedMotion ? (k + 1 < tourStops.length ? k + 1 : null) : null)))}>
              {tour === null ? t("map.tourStart") : reducedMotion ? t("map.tourNext") : t("map.tourStop")}
            </button>
            {tour !== null && tourStops[tour] && (
              <span aria-live="polite">
                <span className="sob-tour-step">{String(tour + 1).padStart(2, "0")} / {String(tourStops.length).padStart(2, "0")} · {tourStops[tour].name}</span>
              </span>
            )}
          </div>
        )}
        <div className="sob-map-tools" role="group" aria-label={t("map.label", { metric: metricLabel })}>
          <button type="button" className="sob-icon-btn" onClick={() => { stopTour(); zoomBy(1.5) }} aria-label={t("map.zoomIn")}>+</button>
          <button type="button" className="sob-icon-btn" onClick={() => { stopTour(); zoomBy(1 / 1.5) }} aria-label={t("map.zoomOut")}>−</button>
          <button type="button" className="sob-icon-btn sob-icon-btn-wide" onClick={() => { stopTour(); resetView(); if (svgRef.current && zoomRef.current) d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity) }}>
            {t("map.resetView")}
          </button>
        </div>
        <svg
          ref={svgRef}
          className="sob-map-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          tabIndex={0}
          aria-label={t("map.label", { metric: metricLabel })}
          onKeyDown={onKey}
          onPointerDown={tour !== null ? stopTour : undefined}
          onWheel={tour !== null ? stopTour : undefined}
        />
        {(failed || (ready && !domain)) && <p className="ed-note sob-map-empty">{t("map.empty")}</p>}
        <p className="ed-muted sob-map-note">{t("map.snapshotOnly")}</p>
      </div>

      <aside className="sob-map-aside">
        <div className="sob-details" aria-live="polite">
          <div className="sob-details-controls">
            <label className="sob-control">
              <span>{t("map.country")}</span>
              <select className="ed-input" value={filters.country ?? ""} onChange={(e) => { stopTour(); update({ country: e.target.value || null }) }}>
                <option value="">{t("map.none")}</option>
                {[...stats.values()].sort((a, b) => a.name.localeCompare(b.name, locale)).map((s) => (
                  <option key={s.iso} value={s.iso}>{s.name}</option>
                ))}
              </select>
            </label>
            {filters.country && (
              <label className="sob-control">
                <span>{t("map.compare")}</span>
                <select className="ed-input" value={filters.compare ?? ""} onChange={(e) => { stopTour(); update({ compare: e.target.value || null }) }}>
                  <option value="">{t("map.none")}</option>
                  {[...stats.values()].filter((s) => s.iso !== filters.country).sort((a, b) => a.name.localeCompare(b.name, locale)).map((s) => (
                    <option key={s.iso} value={s.iso}>{s.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {selected ? (
            <div className={compared ? "sob-compare" : undefined}>
              {[selected, compared].filter(Boolean).map((s) => (
                <DetailCard key={(s as CountryStats).iso} s={s as CountryStats} metric={filters.metric} total={total} nf={nf} pf={pf} t={t} compareTo={s === compared ? selected : null} />
              ))}
              <button type="button" className="ed-link sob-clear" onClick={() => { stopTour(); resetView() }}>{t("map.clear")}</button>
              <span className="sr-only">{t("map.selected", { name: selected.name })}</span>
            </div>
          ) : (
            <p className="ed-muted">{t("map.pick")}</p>
          )}
        </div>

        <h3 className="sob-aside-title">{t("map.top", { metric: metricLabel })}</h3>
        <ol>
          {ranked.slice(0, 10).map((s) => (
            <li key={s.iso}>
              <button type="button" className="sob-rank-btn" aria-pressed={s.iso === filters.country} onClick={() => { stopTour(); update({ country: s.iso === filters.country ? null : s.iso }) }}>
                <span className="sob-map-aside-rank">{String(s.rank).padStart(2, "0")}</span>
                <span className="sob-map-aside-name">{s.name}<em>{t(`filters.regions.${s.region === "Caribbean" ? "Caribbean" : "Africa"}`)}</em></span>
                <span className="sob-map-aside-num">{nf.format(s.value as number)}</span>
              </button>
            </li>
          ))}
        </ol>
        {domain && (
          <div className="sob-map-legend">
            <div>{t("map.legend", { metric: metricLabel })}</div>
            <div className="sob-legend-scale" aria-hidden="true">
              {legendStops.map((c, i) => <span key={i} style={{ background: c }} />)}
            </div>
            <div className="sob-legend-ends">
              <span>{nf.format(domain[0])}</span>
              <span>{nf.format(domain[1])}</span>
            </div>
          </div>
        )}
      </aside>
      <div className="sob-map-tooltip" ref={tipRef} aria-hidden="true" />
    </div>
  )
}

function DetailCard({
  s,
  metric,
  total,
  nf,
  pf,
  t,
  compareTo,
}: {
  s: CountryStats
  metric: Metric
  total: number
  nf: Intl.NumberFormat
  pf: Intl.NumberFormat
  t: ReturnType<typeof useTranslations<"SobExplore">>
  compareTo: CountryStats | null
}) {
  const metrics: Metric[] = ["commits_lifetime", "devs_active_28d", "commits_last_12m"]
  return (
    <div className="sob-detail-card">
      <p className="sob-detail-name">{s.name}</p>
      <p className="ed-muted">
        {s.rank !== null ? t("map.rank", { rank: s.rank, total }) : t("map.noData")}
        {s.share !== null && <> · {t("map.share", { pct: pf.format(s.share) })}</>}
      </p>
      <dl className="sob-detail-dl">
        {metrics.map((m) => {
          const v = s.values[m]
          const ref = compareTo?.values[m]
          const diff = v !== null && ref !== null && ref !== undefined ? v - ref : null
          return (
            <div key={m} className={m === metric ? "is-current" : undefined}>
              <dt>{t(`filters.metrics.${m}`)}</dt>
              <dd>
                {v !== null ? nf.format(v) : t("map.noData")}
                {diff !== null && diff !== 0 && <small> ({diff > 0 ? "+" : "−"}{nf.format(Math.abs(diff))})</small>}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
