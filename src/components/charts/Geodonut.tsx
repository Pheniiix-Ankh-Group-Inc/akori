"use client"
import { useEffect, useRef, useState } from "react"
import { useIntersectionObserver } from "@/components/hooks/Useintersectionobserver"

const SEGMENTS = [
  { pct: 32, color: "#b5883d",              label: "Asie — 32%"        },
  { pct: 31, color: "rgba(196,151,92,.5)",  label: "Europe — 31%"      },
  { pct: 24, color: "rgba(196,151,92,.25)", label: "N. Amérique — 24%" },
  { pct: 13, color: "rgba(196,151,92,.1)",  label: "Reste — 13%"       },
]

const R=33, CX=44, CY=44, SW=12, CIRC=2*Math.PI*R

export function GeoDonut() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { ref, isVisible } = useIntersectionObserver<HTMLDivElement>({ threshold: 0.3 })
  const [ctr, setCtr] = useState(0)
  const animated = useRef(false)

  useEffect(() => {
    if (!isVisible || animated.current) return
    animated.current = true

    // animate counter
    const dur = 1400, start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1)
      setCtr(Math.round(t * 32))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    // animate arcs
    const svg = svgRef.current
    if (!svg) return
    let offset = 0
    SEGMENTS.forEach((seg, i) => {
      const len = CIRC * seg.pct / 100
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle")
      c.setAttribute("cx", String(CX)); c.setAttribute("cy", String(CY)); c.setAttribute("r", String(R))
      c.setAttribute("fill", "none"); c.setAttribute("stroke", seg.color); c.setAttribute("stroke-width", String(SW))
      c.setAttribute("stroke-dasharray", `0 ${CIRC}`)
      c.setAttribute("stroke-dashoffset", String(-offset))
      c.style.transition = `stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1) ${i * 0.18}s`
      svg.appendChild(c)
      setTimeout(() => c.setAttribute("stroke-dasharray", `${len} ${CIRC - len}`), 100)
      offset += len
    })
  }, [isVisible])

  return (
    <div ref={ref}>
      <div className="flex items-center gap-[1.2rem] mt-[.2rem]">
        {/* Donut */}
        <div className="relative w-[88px] h-[88px] flex-shrink-0">
          <svg ref={svgRef} width="88" height="88" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-lt-2)" strokeWidth={SW} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-serif text-[1.15rem] text-lt-ink font-light">{ctr}%</span>
            <span className="text-[.57rem] text-lt-muted">Asie</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-[.45rem]">
          {SEGMENTS.map((seg) => (
            <div key={seg.label} className="flex items-center gap-[.45rem] text-[.71rem] text-lt-muted-2">
              <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: seg.color }} />
              {seg.label}
            </div>
          ))}
        </div>
      </div>
      <p className="text-[.73rem] text-lt-muted-2 mt-[.75rem]">Inde : 17% des nouveaux devs en 2024</p>
    </div>
  )
}