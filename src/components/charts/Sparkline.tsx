"use client"
import { useEffect, useRef } from "react"
import { useIntersectionObserver } from "@/components/hooks/Useintersectionobserver"

const SENIOR = [80,92,108,118,128,142,165,200,238,302]
const NEWBIE  = [420,780,2100,4400,3100,4900,8800,12800,7600,6500]
const DPR = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

const DATASETS = [
  { v: SENIOR, color: "#b5883d" },
  { v: NEWBIE,  color: "rgba(196,151,92,.4)" },
]

function ease(t: number) { return t < 0.5 ? 2*t*t : (-1+(4-2*t)*t) }

export function SparkLine() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { ref: wrapRef, isVisible } = useIntersectionObserver<HTMLDivElement>({ threshold: 0.2 })
  const animated = useRef(false)

  useEffect(() => {
    if (!isVisible || animated.current) return
    animated.current = true
    const c = canvasRef.current
    if (!c) return

    c.width  = c.offsetWidth  * DPR
    c.height = c.offsetHeight * DPR
    const ctx = c.getContext("2d")!
    ctx.scale(DPR, DPR)
    const w = c.offsetWidth, h = c.offsetHeight, pad = 5
    const all = DATASETS.flatMap(d => d.v)
    const min = Math.min(...all), max = Math.max(...all), rng = max - min || 1
    const duration = 1400, start = performance.now()

    function frame(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const prog = ease(t)
      ctx.clearRect(0, 0, w, h)

      DATASETS.forEach(ds => {
        const pts = ds.v.map((v, i) => ({
          x: pad + (i / (ds.v.length - 1)) * (w - 2*pad),
          y: (h - 2*pad) - (v - min) / rng * (h - 2*pad) + pad,
        }))
        const end = Math.floor(prog * (pts.length - 1))

        // fill
        const g = ctx.createLinearGradient(0, 0, 0, h)
        g.addColorStop(0, ds.color + "28"); g.addColorStop(1, ds.color + "00")
        ctx.beginPath(); ctx.moveTo(pts[0].x, h)
        pts.slice(0, end + 1).forEach(p => ctx.lineTo(p.x, p.y))
        if (end < pts.length - 1) {
          const frac = prog * (pts.length - 1) - end
          ctx.lineTo(pts[end].x + (pts[end+1].x - pts[end].x) * frac, pts[end].y + (pts[end+1].y - pts[end].y) * frac)
        }
        ctx.lineTo(pts[Math.min(end, pts.length-1)].x, h)
        ctx.fillStyle = g; ctx.fill()

        // line
        ctx.beginPath()
        pts.slice(0, end + 1).forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
        if (end < pts.length - 1) {
          const frac = prog * (pts.length - 1) - end
          ctx.lineTo(pts[end].x + (pts[end+1].x - pts[end].x) * frac, pts[end].y + (pts[end+1].y - pts[end].y) * frac)
        }
        ctx.strokeStyle = ds.color; ctx.lineWidth = 1.5; ctx.stroke()
      })
      if (t < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [isVisible])

  return (
    <div ref={wrapRef}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "52px" }} />
      <div className="flex gap-[1.1rem] mt-[.9rem]">
        <div className="flex items-center gap-[.38rem] text-[.7rem] text-lt-muted-2">
          <span className="w-1.75 h-1.75 rounded-full bg-gold-lt" />Seniors +27%
        </div>
        <div className="flex items-center gap-[.38rem] text-[.7rem] text-lt-muted-2">
          <span className="w-1.75 h-1.75 rounded-full" style={{ background: "rgba(196,151,92,.35)" }} />Nouveaux −14%
        </div>
      </div>
    </div>
  )
}