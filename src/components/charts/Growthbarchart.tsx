"use client"
import { useEffect, useRef } from "react"
import { useIntersectionObserver } from "@/../src/components/hooks/Useintersectionobserver"

const YEARS = ["15","16","17","18","19","20","21","22","23","24"]
const DEVS  = [1000,1900,4200,7200,8100,11000,18000,31000,25419,23613]
const DPR   = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

function ease(t: number) { return t < 0.5 ? 2*t*t : (-1+(4-2*t)*t) }

export function GrowthBarChart() {
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
    const w = c.offsetWidth, h = c.offsetHeight
    const pL=6, pR=6, pT=8, pB=22, cw=w-pL-pR, ch=h-pT-pB
    const max = Math.max(...DEVS)
    const bw  = cw / DEVS.length * 0.54
    const duration = 1600
    const start = performance.now()

    function frame(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const prog = ease(t)
      ctx.clearRect(0, 0, w, h)

      DEVS.forEach((v, i) => {
        const fullBh = v / max * ch
        const bh = fullBh * prog
        const x  = pL + (i + 0.5) * (cw / DEVS.length) - bw / 2
        const y  = pT + ch - bh
        const g  = ctx.createLinearGradient(0, y, 0, y + bh)
        g.addColorStop(0, "rgba(196,151,92,.85)")
        g.addColorStop(1, "rgba(196,151,92,.18)")
        ctx.fillStyle = g
        ctx.beginPath()
        ;(ctx as CanvasRenderingContext2D & { roundRect: (...a: number[]) => void }).roundRect(x, y, bw, bh, 2)
        ctx.fill()

        if (prog > 0.5) {
          ctx.globalAlpha = Math.min(1, (prog - 0.5) * 2)
          ctx.fillStyle = "rgba(138,134,128,.8)"
          ctx.font = `${Math.min(9, bw)}px DM Sans,sans-serif`
          ctx.textAlign = "center"
          ctx.fillText(YEARS[i], x + bw / 2, h - 5)
          ctx.globalAlpha = 1
        }
      })

      if (prog > 0.3) {
        const lp  = (prog - 0.3) / 0.7
        const pts = DEVS.map((v, i) => ({
          x: pL + (i + 0.5) * (cw / DEVS.length),
          y: pT + ch - v / max * ch,
        }))
        const drawn = Math.floor(lp * (pts.length - 1))
        ctx.beginPath()
        pts.slice(0, drawn + 1).forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
        if (drawn < pts.length - 1) {
          const frac = lp * (pts.length - 1) - drawn
          ctx.lineTo(pts[drawn].x + (pts[drawn+1].x - pts[drawn].x) * frac, pts[drawn].y + (pts[drawn+1].y - pts[drawn].y) * frac)
        }
        ctx.strokeStyle = "rgba(181,136,61,.5)"
        ctx.lineWidth   = 1.5
        ctx.stroke()

        pts.slice(0, drawn + 1).forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI*2); ctx.fillStyle = "#b5883d"; ctx.fill()
        })
      }
      if (t < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [isVisible])

  return (
    <div ref={wrapRef}>
      <canvas ref={canvasRef} height={150} style={{ display:"block", width:"100%", height:"150px" }} />
      <p className="text-[.66rem] text-lt-muted mt-[.65rem] opacity-70">+2000% depuis le lancement d&apos;Ethereum en 2015 · 39% CAGR</p>
    </div>
  )
}