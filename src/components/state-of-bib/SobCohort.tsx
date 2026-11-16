"use client"
import { useEffect, useRef } from "react"
import * as d3 from "d3"
import { fmtK } from "./format"
import type { SobCohort as SobCohortData } from "./types"

type Props = {
  cohort: SobCohortData
  labels: {
    newcomersShort: string
    newcomersName: string
    apprenticedShort: string
    apprenticedName: string
    eldersShort: string
    eldersName: string
  }
}

type Row = {
  month: Date
  devs_0_1y: number
  devs_1_2y: number
  devs_2y_plus: number
}

export function SobCohort({ cohort, labels }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svgEl = svgRef.current
    const legendEl = legendRef.current
    if (!svgEl || !legendEl) return

    const parse = d3.timeParse("%Y-%m")
    const data: Row[] = cohort.months.map((m, i) => ({
      month: parse(m) as Date,
      devs_0_1y: cohort.devs_0_1y[i],
      devs_1_2y: cohort.devs_1_2y[i],
      devs_2y_plus: cohort.devs_2y_plus[i],
    }))

    const keys = ["devs_0_1y", "devs_1_2y", "devs_2y_plus"] as const
    const palette: Record<(typeof keys)[number], { color: string; short: string; name: string }> = {
      devs_0_1y:    { color: "#e8a836", short: labels.newcomersShort, name: labels.newcomersName },
      devs_1_2y:    { color: "#c7382c", short: labels.apprenticedShort, name: labels.apprenticedName },
      devs_2y_plus: { color: "#2d5cc9", short: labels.eldersShort, name: labels.eldersName },
    }

    const svg = d3.select(svgEl)
    svg.selectAll("*").remove()
    const bbox = svgEl.getBoundingClientRect()
    const W = Math.max(bbox.width || 800, 320)
    const H = 460
    const margin = { top: 10, right: 40, bottom: 40, left: 48 }
    svg.attr("viewBox", `0 0 ${W} ${H}`)

    const stack = d3.stack<Row>().keys(keys as unknown as string[])
    const stacked = stack(data)

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.month) as [Date, Date])
      .range([margin.left, W - margin.right])
    const yMax = d3.max(stacked[stacked.length - 1], d => d[1]) || 1
    const y = d3.scaleLinear()
      .domain([0, yMax * 1.02])
      .range([H - margin.bottom, margin.top])

    const area = d3.area<d3.SeriesPoint<Row>>()
      .x(d => x(d.data.month))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveMonotoneX)

    svg.append("g").selectAll("path").data(stacked).join("path")
      .attr("class", "area")
      .attr("d", d => area(d) || "")
      .attr("fill", d => palette[d.key as keyof typeof palette].color)
      .attr("fill-opacity", 0.85)

    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b '%y") as (v: Date | d3.NumberValue) => string))
    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat((v) => fmtK(v as number)))

    legendEl.innerHTML = keys.map(k => `
      <div class="sob-cohort-legend-item">
        <span class="sob-cohort-legend-swatch" style="background:${palette[k].color}"></span>
        <span>${palette[k].short} · <b>${palette[k].name}</b></span>
      </div>`).join("")
  }, [cohort, labels])

  return (
    <>
      <svg ref={svgRef} className="sob-cohort-svg" role="img" aria-label="Tenure cohort over time" />
      <div ref={legendRef} className="sob-cohort-legend" />
    </>
  )
}
