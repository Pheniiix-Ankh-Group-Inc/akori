"use client"
import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"

const BARS = [
  { label: "Nigeria", code: "NGA", width: 94, value: "47.3%" },
  { label: "Kenya", code: "KEN", width: 84, value: "42.1%" },
  { label: "Ghana", code: "GHA", width: 68, value: "34.0%" },
  { label: "South Africa", code: "ZAF", width: 58, value: "29.2%" },
  { label: "United States", code: "USA", width: 42, value: "21.0%" },
  { label: "Haiti", code: "HTI", width: 34, value: "17.1%" },
  { label: "Jamaica", code: "JAM", width: 28, value: "14.0%" },
  { label: "United Kingdom", code: "GBR", width: 26, value: "13.1%" },
]

export function SectionData() {
  const t = useTranslations("Data")
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = barsRef.current
    if (!root) return
    const fills = root.querySelectorAll<HTMLDivElement>(".bib-bar-fill")
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting || (e.target as HTMLElement).dataset.animated) return
          ; (e.target as HTMLElement).dataset.animated = "true"
        const bar = e.target as HTMLDivElement
        const i = Array.from(fills).indexOf(bar)
        setTimeout(() => { bar.style.width = bar.dataset.width + "%" }, i * 80)
      })
    }, { threshold: 0.3 })
    fills.forEach(f => io.observe(f))
    return () => io.disconnect()
  }, [])

  return (
    <section className="bib-data" data-section="07" data-title="THE DATA">
      <div className="bib-data-head">
        <div>
          <div className="bib-eyebrow">{t("eyebrow")}</div>
          <h2 className="bib-data-title" dangerouslySetInnerHTML={{ __html: t.raw("title") }} />
        </div>
        <p className="bib-data-intro">{t("intro")}</p>
      </div>

      <div className="bib-data-grid" ref={barsRef}>
        <div className="bib-data-viz bib-data-viz-wide">
          <div className="bib-viz-header">
            <span className="bib-viz-num">{t("viz1.num")}</span>
            <h3 className="bib-viz-title" dangerouslySetInnerHTML={{ __html: t.raw("viz1.title") }} />
            <span className="bib-viz-source">{t("viz1.source")}</span>
          </div>
          <div className="bib-bar-chart">
            {BARS.map(b => (
              <div key={b.code} className="bib-bar-row">
                <span className="bib-bar-label"><small>{b.code}</small>{b.label}</span>
                <div className="bib-bar"><div className="bib-bar-fill" data-width={b.width} /></div>
                <span className="bib-bar-value">{b.value}</span>
              </div>
            ))}
          </div>
          <div className="bib-viz-footnote">
            <span>{t("viz1.footN")}</span>
            <span dangerouslySetInnerHTML={{ __html: t.raw("viz1.footRank") }} />
          </div>
        </div>

        <div className="bib-data-viz">
          <div className="bib-viz-header">
            <span className="bib-viz-num">{t("viz2.num")}</span>
            <h3 className="bib-viz-title" dangerouslySetInnerHTML={{ __html: t.raw("viz2.title") }} />
          </div>
          <div className="bib-viz-big-stat">12.4<sup>K</sup></div>
          <p className="bib-viz-caption">{t("viz2.caption")}</p>
          <div className="bib-viz-delta">{t("viz2.delta")}</div>
        </div>

        <div className="bib-data-viz">
          <div className="bib-viz-header">
            <span className="bib-viz-num">{t("viz3.num")}</span>
            <h3 className="bib-viz-title" dangerouslySetInnerHTML={{ __html: t.raw("viz3.title") }} />
          </div>
          <svg className="bib-viz-line-svg" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e8a836" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#e8a836" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="35" x2="400" y2="35" stroke="rgba(242,236,224,0.08)" />
            <line x1="0" y1="70" x2="400" y2="70" stroke="rgba(242,236,224,0.08)" />
            <line x1="0" y1="105" x2="400" y2="105" stroke="rgba(242,236,224,0.08)" />
            <path d="M 0 125 L 50 118 L 100 108 L 150 94 L 200 80 L 250 62 L 300 44 L 350 28 L 400 14 L 400 140 L 0 140 Z" fill="url(#lineGrad)" />
            <path d="M 0 125 L 50 118 L 100 108 L 150 94 L 200 80 L 250 62 L 300 44 L 350 28 L 400 14" fill="none" stroke="#e8a836" strokeWidth="1.5" />
            <circle cx="50" cy="118" r="3" fill="#e8a836" />
            <circle cx="100" cy="108" r="3" fill="#e8a836" />
            <circle cx="150" cy="94" r="3" fill="#e8a836" />
            <circle cx="200" cy="80" r="3" fill="#e8a836" />
            <circle cx="250" cy="62" r="3" fill="#e8a836" />
            <circle cx="300" cy="44" r="3" fill="#e8a836" />
            <circle cx="350" cy="28" r="3" fill="#e8a836" />
            <circle cx="400" cy="14" r="4" fill="#e8a836" stroke="#0b0f1c" strokeWidth="2" />
          </svg>
          <div className="bib-viz-footnote" style={{ marginTop: "16px" }}>
            <span>&apos;18</span><span>&apos;20</span><span>&apos;22</span><span>&apos;24</span><span><b>&apos;26</b></span>
          </div>
          <p className="bib-viz-caption" style={{ marginTop: "18px" }}>{t("viz3.caption")}</p>
        </div>

        <div className="bib-data-viz">
          <div className="bib-viz-header">
            <span className="bib-viz-num">{t("viz4.num")}</span>
            <h3 className="bib-viz-title" dangerouslySetInnerHTML={{ __html: t.raw("viz4.title") }} />
          </div>
          <div className="bib-viz-big-stat">$41<sup>M</sup></div>
          <p className="bib-viz-caption">{t("viz4.caption")}</p>
          <div className="bib-viz-delta">{t("viz4.delta")}</div>
        </div>
      </div>
    </section>
  )
}
