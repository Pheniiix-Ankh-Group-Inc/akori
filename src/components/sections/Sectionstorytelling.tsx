"use client"

import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"

const CHAPTERS = (t: any) => [
  {
    num: "01",
    reverse: false,
    photoClass: "ph1",
    photoBg: "linear-gradient(135deg, #141210 0%, #1c1914 50%, #0e0d0b 100%)",
    headline: (
      <>
        {t("chapters.c1.headline.line1")}<br />
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
          {t("chapters.c1.headline.highlight")}
        </em>
      </>
    ),
    body: t("chapters.c1.body"),
    link: { label: t("chapters.c1.link"), href: "#adhesion" },
  },
  {
    num: "02",
    reverse: true,
    photoClass: "ph2",
    photoBg: "linear-gradient(135deg, #0e1210 0%, #131a14 50%, #0c0e0b 100%)",
    headline: (
      <>
        {t("chapters.c2.headline.line1")}<br />
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
          {t("chapters.c2.headline.highlight")}
        </em>
      </>
    ),
    body: t("chapters.c2.body"),
    link: { label: t("chapters.c2.link"), href: "#evenements" },
  },
  {
    num: "03",
    reverse: false,
    photoClass: "ph3",
    photoBg: "linear-gradient(135deg, #100e14 0%, #17131e 50%, #0c0a10 100%)",
    headline: (
      <>
        {t("chapters.c3.headline.line1")}<br />
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
          {t("chapters.c3.headline.highlight")}
        </em>
      </>
    ),
    body: t("chapters.c3.body"),
    link: { label: t("chapters.c3.link"), href: "#ressources" },
  },
  {
    num: "04",
    reverse: true,
    photoClass: "ph4",
    photoBg: "linear-gradient(135deg, #0e1210 0%, #131a14 50%, #0c0e0b 100%)",
    headline: (
      <>
        {t("chapters.c4.headline.line1")}<br />
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
          {t("chapters.c4.headline.highlight")}
        </em>
      </>
    ),
    body: t("chapters.c4.body"),
    link: { label: t("chapters.c4.link"), href: "#partenaires" },
  },
]

function StoryChapter({ chapter, index }: any) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return

    const onScroll = () => {
      const rect = wrap.getBoundingClientRect()
      const center = rect.top + rect.height / 2 - window.innerHeight / 2
      inner.style.transform = `translateY(${center * 0.35}px)`
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const isReverse = chapter.reverse
  const bgText = isReverse ? "var(--bg-2)" : "var(--bg)"

  return (
    <div className="story-chapter">
      <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "90vh",
        borderTop: "1px solid var(--border)",
        direction: isReverse ? "rtl" : "ltr",
      }}
      className="story-chapter"
    >
      {/* Photo parallax */}
      <div
        ref={wrapRef}
        data-parallax
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "600px",
          direction: "ltr",
        }}
      >
        <div
          ref={innerRef}
          className="story-photo-inner"
          style={{
            position: "absolute",
            inset: "-20% 0",
            width: "100%",
            height: "140%",
            background: chapter.photoBg,
            backgroundSize: "cover",
            backgroundPosition: "center",
            willChange: "transform",
            /* ↓ PRODUCTION : backgroundImage: "url('/photos/chap-N.jpg')" */
          }}
        />
      </div>

      {/* Texte */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "6rem 5rem",
          background: bgText,
          direction: "ltr",
        }}
      >
        <div
          data-reveal
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "5rem",
            fontWeight: 200,
            color: "var(--accent)",
            opacity: 0.15,
            lineHeight: 1,
            marginBottom: "1.5rem",
          }}
        >
          {chapter.num}
        </div>

        <h3
          data-reveal
          data-delay="1"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.8rem, 2.5vw, 2.5rem)",
            fontWeight: 300,
            color: "var(--blanc)",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            marginBottom: "1.5rem",
          }}
        >
          {chapter.headline}
        </h3>

        <p
          data-reveal
          data-delay="2"
          style={{
            fontSize: "1rem",
            color: "var(--texte-2)",
            lineHeight: 1.85,
            fontWeight: 300,
            marginBottom: "2rem",
          }}
        >
          {chapter.body}
        </p>

        {/* <a
          href={chapter.link.href}
          data-reveal
          data-delay="3"
          style={{
            fontSize: "0.82rem",
            color: "var(--accent)",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "gap 0.3s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.gap = "0.7rem")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.gap = "0.4rem")
          }
        >
          {chapter.link.label}
        </a> */}
      </div>
     </div>
    </div>
  )
}

export function SectionStorytelling() {
  const t = useTranslations("sectionStorytelling")

  return (
    <section id="storytelling" style={{ paddingTop: "var(--pad)" }}>
      <div className="wrap" style={{ paddingBottom: "7rem", maxWidth: "700px" }}>
        <span data-reveal
        style={{
            display: "block",
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: "1.5rem",
          }}>
          {t("intro.label")}
        </span>

        <h2 
          data-reveal 
          data-delay="1"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 200,
            color: "var(--blanc)",
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            fontSize: "clamp(2.5rem, 4vw, 4rem)",
          }}>
          {t("intro.title.line1")}<br />
          {t("intro.title.line2")}{" "}
          <em style={{ fontStyle: "italic", fontWeight: 200 }}>{t("intro.title.highlight")}</em>
          
          <br />
          {t("intro.title.line3")}
        </h2>
      </div>


      {CHAPTERS(t).map((chapter, i) => (
        <StoryChapter key={chapter.num} chapter={chapter} index={i} />
      ))}

      <style>{`
        @media (max-width: 1024px) {
          .story-chapter {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
            direction: ltr !important;
          }
          .story-chapter .story-photo-inner {
            inset: 0 !important;
            height: 100% !important;
          }
          .story-chapter > div:first-child {
            min-height: 360px !important;
            direction: ltr !important;
          }
          .story-chapter > div:last-child {
            padding: 3rem 2rem !important;
            direction: ltr !important;
          }
        }
      `}</style>
    </section>
  )
}