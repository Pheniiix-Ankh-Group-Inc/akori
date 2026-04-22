"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"

const REGIONS = ["na", "africa", "caribbean", "europe"] as const
type RegionKey = typeof REGIONS[number]

const NODES = [
  { cx: 140, cy: 180, dur: "2.4s" },
  { cx: 460, cy: 140, dur: "2.6s" },
  { cx: 120, cy: 440, dur: "2.8s" },
  { cx: 480, cy: 420, dur: "2.2s" },
] as const

export function SectionConstellation() {
  const t = useTranslations("Constellation")
  const [active, setActive] = useState<number>(0)
  const key: RegionKey = REGIONS[active]
  const r = (k: string) => t.raw(`regions.${key}.${k}`) as string

  return (
    <section
      className="bib-constellation"
      id="chapters"
      data-section="03"
      data-title="THE CONSTELLATION"
    >
      <div className="bib-constellation-head">
        <div className="bib-eyebrow-dark">{t("eyebrow")}</div>
        <h2 className="bib-constellation-title" dangerouslySetInnerHTML={{ __html: t.raw("title") }} />
      </div>

      <div className="bib-constellation-map">
        <div className="bib-map-viz">
          <svg viewBox="0 0 600 600" aria-hidden>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <circle cx="300" cy="300" r="36" fill="#0b0f1c" opacity="0.4" />
            <circle cx="300" cy="300" r="28" fill="#e8a836" filter="url(#glow)" />
            <circle cx="300" cy="300" r="14" fill="#0b0f1c" />

            {NODES.map((n) => (
              <line key={`${n.cx}-${n.cy}`}
                x1="300" y1="300" x2={n.cx} y2={n.cy}
                stroke="#0b0f1c" strokeWidth="1" strokeDasharray="3,4" opacity="0.5" />
            ))}
            <circle cx="300" cy="300" r="220" fill="none" stroke="#0b0f1c" strokeWidth="1" opacity="0.2" />

            {NODES.map((n, i) => (
              <g
                key={i}
                className={`bib-region-node${active === i ? " active" : ""}`}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
              >
                <circle cx={n.cx} cy={n.cy} r="22" fill="#0b0f1c" opacity="0.3">
                  <animate attributeName="r" values="22;36;22" dur={n.dur} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur={n.dur} repeatCount="indefinite" />
                </circle>
                <circle className="dot" cx={n.cx} cy={n.cy} r="10" fill="#f2ece0" />
              </g>
            ))}

            <circle cx="320" cy="120" r="2" fill="#0b0f1c" opacity="0.5" />
            <circle cx="510" cy="280" r="2" fill="#0b0f1c" opacity="0.5" />
            <circle cx="200" cy="320" r="2" fill="#0b0f1c" opacity="0.5" />
            <circle cx="380" cy="500" r="2" fill="#0b0f1c" opacity="0.5" />
          </svg>

          <div className="bib-node-label" style={{ top: "22%", left: "2%" }}>
            {t("label1")}<b>{t("hub1")}</b>
          </div>
          <div className="bib-node-label" style={{ top: "14%", right: "2%" }}>
            {t("label2")}<b>{t("hub2")}</b>
          </div>
          <div className="bib-node-label" style={{ bottom: "18%", left: 0 }}>
            {t("label3")}<b>{t("hub3")}</b>
          </div>
          <div className="bib-node-label" style={{ bottom: "22%", right: 0 }}>
            {t("label4")}<b>{t("hub4")}</b>
          </div>
        </div>

        <div className="bib-map-detail" key={active}>
          <div className="bib-map-detail-num">{r("num")}</div>
          <h3 className="bib-map-detail-name" dangerouslySetInnerHTML={{ __html: r("name") }} />
          <div className="bib-map-detail-sub">{r("sub")}</div>
          <p className="bib-map-detail-desc">{r("desc")}</p>
          <div className="bib-map-detail-cities" dangerouslySetInnerHTML={{ __html: r("cities") }} />
          <div className="bib-map-detail-stat">
            <div><b>{r("chapters")}</b> {r("chaptersLabel")}</div>
            <div><b>{r("members")}</b> {r("membersLabel")}</div>
            <div><b>{r("capital")}</b> {r("capitalLabel")}</div>
          </div>
        </div>
      </div>

      <div className="bib-constellation-legend">
        {([0, 1, 2, 3] as const).map(i => (
          <div
            key={i}
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            data-hover
          >
            <span className="swatch" />
            {t(`legend${(i + 1) as 1 | 2 | 3 | 4}`)}
          </div>
        ))}
      </div>
    </section>
  )
}
