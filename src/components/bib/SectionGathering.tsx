"use client"
import { useRef } from "react"
import { useTranslations } from "next-intl"

const EVENTS = [
  { key: "lagos", bg: "linear-gradient(135deg, #c7382c 0%, #9a2818 100%)", orb: "#e8a836" },
  { key: "montreal", bg: "linear-gradient(135deg, #12274f 0%, #2d5cc9 100%)", orb: "#4a7fd4" },
  { key: "kingston", bg: "linear-gradient(135deg, #1a5f4a 0%, #0d3a2d 100%)", orb: "#4ab38f" },
  { key: "london", bg: "linear-gradient(135deg, #4a2d5f 0%, #2a1a3a 100%)", orb: "#c88ce8" },
  { key: "nairobi", bg: "linear-gradient(135deg, #8b5a2c 0%, #5a3820 100%)", orb: "#e8a836" },
] as const

export function SectionGathering() {
  const t = useTranslations("Gathering")
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: number) => {
    trackRef.current?.scrollBy({ left: dir * 412, behavior: "smooth" })
  }

  return (
    <section
      className="bib-gathering"
      id="gathering"
      data-section="12"
      data-title="THE GATHERING"
    >
      <div className="bib-gathering-head">
        <div>
          <div className="bib-eyebrow">{t("eyebrow")}</div>
          <h2 className="bib-gathering-title" dangerouslySetInnerHTML={{ __html: t.raw("title") }} />
        </div>
        <div className="bib-gathering-nav">
          <button type="button" onClick={() => scroll(-1)} data-hover>{t("prev")}</button>
          <button type="button" onClick={() => scroll(1)} data-hover>{t("next")}</button>
        </div>
      </div>

      <div className="bib-gathering-track" ref={trackRef}>
        {EVENTS.map(({ key, bg, orb }) => (
          <div
            key={key}
            className="bib-event-card"
            style={{ "--ebg": bg, "--eorb": orb } as React.CSSProperties}
            data-hover
          >
            <div className="bib-event-bg" />
            <div className="bib-event-orb" />
            <div className="bib-event-content">
              <div>
                <div className="bib-event-date">{t(`items.${key}.date`)}</div>
              </div>
              <div className="bib-event-bottom">
                <h3
                  className="bib-event-city"
                  dangerouslySetInnerHTML={{ __html: t.raw(`items.${key}.city`) }}
                />
                <p className="bib-event-title">{t(`items.${key}.text`)}</p>
                <div className="bib-event-meta">
                  <span>{t(`items.${key}.meta1`)}</span>
                  <span>{t(`items.${key}.meta2`)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
