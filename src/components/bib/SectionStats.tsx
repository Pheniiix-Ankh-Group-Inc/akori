"use client"
import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"

const STATS = [
  { target: 2.8, prefix: "", sup: "K" },
  { target: 37, prefix: "", sup: "" },
  { target: 41, prefix: "$", sup: "M" },
  { target: 4, prefix: "", sup: "" },
]

export function SectionStats() {
  const t = useTranslations("Stats")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const nums = root.querySelectorAll<HTMLElement>(".bib-stat-num")
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting || (e.target as HTMLElement).dataset.counted) return
          ; (e.target as HTMLElement).dataset.counted = "true"
        const i = Array.from(nums).indexOf(e.target as HTMLElement)
        const d = STATS[i]
        const isFloat = d.target % 1 !== 0
        const start = performance.now()
        const step = (now: number) => {
          const p = Math.min((now - start) / 1800, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          const c = d.target * eased
          const val = isFloat ? c.toFixed(1) : String(Math.round(c))
            ; (e.target as HTMLElement).innerHTML = (d.prefix || "") + val + (d.sup ? `<sup>${d.sup}</sup>` : "")
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      })
    }, { threshold: 0.4 })
    nums.forEach(n => io.observe(n))
    return () => io.disconnect()
  }, [])

  return (
    <section className="bib-stats" data-section="14" data-title="THE NUMBERS">
      <div className="bib-stats-grid" ref={ref}>
        <div className="bib-stat">
          <div className="bib-stat-num">0</div>
          <div className="bib-stat-label">{t("stat1")}</div>
        </div>
        <div className="bib-stat">
          <div className="bib-stat-num">0</div>
          <div className="bib-stat-label">{t("stat2")}</div>
        </div>
        <div className="bib-stat">
          <div className="bib-stat-num">0</div>
          <div className="bib-stat-label">{t("stat3")}</div>
        </div>
        <div className="bib-stat">
          <div className="bib-stat-num">0</div>
          <div className="bib-stat-label">{t("stat4")}</div>
        </div>
      </div>
    </section>
  )
}
