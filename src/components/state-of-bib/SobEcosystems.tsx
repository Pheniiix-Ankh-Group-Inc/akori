"use client"
import { useEffect, useRef } from "react"
import * as d3 from "d3"
import { fmt } from "./format"
import type { SobEcosystem } from "./types"

type Props = {
  ecosystems: SobEcosystem[]
  labels: { devsLabel: string; indexLabel: string }
}

export function SobEcosystems({ ecosystems, labels }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    ecosystems.forEach(e => {
      const svg = d3.select(root.querySelector<SVGSVGElement>(`#spark-${e.id}`)!)
      svg.selectAll("*").remove()
      const W = 240, H = 72
      const series = e.series_indexed
      const x = d3.scaleLinear().domain([0, series.length - 1]).range([0, W])
      const minY = d3.min(series) || 0
      const maxY = d3.max(series) || 1
      const y = d3.scaleLinear().domain([minY * 0.95, maxY * 1.05]).range([H - 4, 4])
      const line = d3.line<number>().x((_, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX)
      const area = d3.area<number>().x((_, i) => x(i)).y0(H).y1(d => y(d)).curve(d3.curveMonotoneX)
      svg.append("line").attr("class", "baseline").attr("x1", 0).attr("x2", W).attr("y1", y(100)).attr("y2", y(100))
      svg.append("path").attr("class", "area").attr("d", area(series) || "")
      svg.append("path").attr("class", "line").attr("d", line(series) || "")
      svg.append("circle").attr("r", 2.5)
        .attr("cx", x(series.length - 1))
        .attr("cy", y(series[series.length - 1]))
    })
  }, [ecosystems])

  return (
    <div className="sob-eco-grid" ref={rootRef}>
      {ecosystems.map((e, i) => {
        const first = e.series_indexed[0]
        const last = e.series_indexed[e.series_indexed.length - 1]
        const delta = Math.round(last - first)
        const down = delta < 0
        const arrow = down ? "↓" : "↑"
        return (
          <div key={e.id} className="sob-eco-card">
            <div className="sob-eco-rank">— {String(i + 1).padStart(2, "0")}</div>
            <div className="sob-eco-name">{e.name}<em>.</em></div>
            <div className="sob-eco-devs">
              <b>{fmt(e.devs_recent)}</b> {labels.devsLabel.toUpperCase()}
            </div>
            <svg className="sob-eco-spark" id={`spark-${e.id}`} viewBox="0 0 240 72" preserveAspectRatio="none" />
            <div className="sob-eco-change">
              <span>{labels.indexLabel.toUpperCase()} {first} → {last}</span>
              <b className={down ? "down" : ""}>{arrow} {Math.abs(delta)}%</b>
            </div>
          </div>
        )
      })}
    </div>
  )
}
