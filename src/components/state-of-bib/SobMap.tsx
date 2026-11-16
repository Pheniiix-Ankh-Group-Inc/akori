"use client"
import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"
import { fmt, fmtK } from "./format"
import type { SobCountry } from "./types"

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
  "630": "PRI", "312": "GLP", "474": "MTQ", "533": "ABW", "531": "CUW", "500": "MSR"
}
const SCOPE_A3 = new Set(Object.values(ISO_NUM_TO_A3))

type Props = {
  map: SobCountry[]
  labels: {
    top10: string
    legendLabel: string
    legendLow: string
    legendHigh: string
    tipCommits: string
    tipActive: string
  }
}

type CountryFeature = {
  id: string
  properties?: Record<string, unknown>
  geometry: GeoJSON.Geometry
  type: "Feature"
}

export function SobMap({ map, labels }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [top10, setTop10] = useState<SobCountry[]>([])

  useEffect(() => {
    setTop10([...map].sort((a, b) => b.commits_lifetime - a.commits_lifetime).slice(0, 10))
  }, [map])

  useEffect(() => {
    const svgEl = svgRef.current
    const legendEl = legendRef.current
    const tooltipEl = tooltipRef.current
    if (!svgEl || !legendEl || !tooltipEl) return

    let cancelled = false
    ;(async () => {
      try {
        const byA3 = new Map(map.map(d => [d.iso_a3, d]))
        const world = await fetch("/data/countries-110m.json").then(r => r.json())
        if (cancelled) return
        const fc = feature(world, world.objects.countries) as unknown as {
          features: CountryFeature[]
        }
        const features = fc.features.map(f => ({ ...f, id: String(f.id) }))

        const scopedFeats = features.filter(f => SCOPE_A3.has(ISO_NUM_TO_A3[f.id]))
        const otherFeats = features.filter(f => !SCOPE_A3.has(ISO_NUM_TO_A3[f.id]))

        const svg = d3.select(svgEl)
        svg.selectAll("*").remove()
        const W = 900, H = 620
        svg.attr("viewBox", `0 0 ${W} ${H}`)

        const proj = d3.geoEqualEarth().fitSize(
          [W - 40, H - 40],
          { type: "FeatureCollection", features: scopedFeats as unknown as GeoJSON.Feature[] } as GeoJSON.FeatureCollection
        )
        const [tx, ty] = proj.translate()
        proj.translate([tx + 20, ty + 20])
        const path = d3.geoPath(proj)

        const maxCommits = d3.max(map, d => d.commits_lifetime) || 1
        const minCommits = d3.min(map, d => d.commits_lifetime) || 1
        const color = d3.scaleSequentialLog()
          .domain([Math.max(minCommits, 100), maxCommits])
          .interpolator(d3.interpolateLab("#f2ece0", "#c7382c"))

        svg.append("g").attr("class", "bg")
          .selectAll("path").data(otherFeats).join("path")
          .attr("d", d => path(d as unknown as GeoJSON.Feature) ?? "")
          .attr("class", "country-bg")

        svg.append("g").attr("class", "fg")
          .selectAll("path").data(scopedFeats).join("path")
          .attr("d", d => path(d as unknown as GeoJSON.Feature) ?? "")
          .attr("class", "country")
          .attr("fill", d => {
            const m = byA3.get(ISO_NUM_TO_A3[d.id])
            return m && m.commits_lifetime > 0 ? color(m.commits_lifetime) : "rgba(11,15,28,0.08)"
          })
          .on("mousemove", (ev: MouseEvent, d) => {
            const m = byA3.get(ISO_NUM_TO_A3[d.id])
            if (!m) return
            tooltipEl.style.left = (ev.clientX + 16) + "px"
            tooltipEl.style.top = (ev.clientY + 16) + "px"
            tooltipEl.style.opacity = "1"
            tooltipEl.innerHTML = `<b>${m.name}</b>${fmt(m.commits_lifetime)} ${labels.tipCommits.toUpperCase()}<br>${fmt(m.devs_active_28d)} ${labels.tipActive.toUpperCase()}`
          })
          .on("mouseleave", () => { tooltipEl.style.opacity = "0" })

        const legend = d3.select(legendEl)
        legend.selectAll("*").remove()
        const stops = d3.range(8).map(i => i / 7)
        stops.forEach(t => {
          const v = Math.exp(Math.log(Math.max(minCommits, 100)) + t * (Math.log(maxCommits) - Math.log(Math.max(minCommits, 100))))
          legend.append("span").style("background", color(v))
        })
      } catch (err) {
        console.error("SobMap render failed:", err)
      }
    })()

    return () => { cancelled = true }
  }, [map, labels])

  return (
    <div className="sob-map-frame">
      <svg ref={svgRef} className="sob-map-svg" viewBox="0 0 900 620" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Choropleth of commits per country" />
      <aside className="sob-map-aside">
        <h4>{labels.top10}</h4>
        <ol>
          {top10.map((d, i) => (
            <li key={d.iso_a3}>
              <span className="sob-map-aside-rank">{String(i + 1).padStart(2, "0")}</span>
              <span className="sob-map-aside-name">{d.name}<em>{d.region}</em></span>
              <span className="sob-map-aside-num">{fmtK(d.commits_lifetime)}</span>
            </li>
          ))}
        </ol>
        <div className="sob-map-legend">
          <div>{labels.legendLabel}</div>
          <div className="sob-legend-scale" ref={legendRef} />
          <div className="sob-legend-ends">
            <span>{labels.legendLow.toUpperCase()}</span>
            <span>{labels.legendHigh.toUpperCase()}</span>
          </div>
        </div>
      </aside>
      <div className="sob-map-tooltip" ref={tooltipRef} />
    </div>
  )
}
