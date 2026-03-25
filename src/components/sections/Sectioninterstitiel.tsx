"use client"

import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"

export function SectionInterstitiel() {
  const t = useTranslations("sectionInterstitiel")
  const bgRef   = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const bg   = bgRef.current
    const wrap = wrapRef.current
    if (!bg || !wrap) return

    const onScroll = () => {
      const rect   = wrap.getBoundingClientRect()
      const center = rect.top + rect.height / 2 - window.innerHeight / 2
      bg.style.transform = `translateY(${center * 0.18}px)`
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <section
      ref={wrapRef}
      id="interstitiel"
      style={{
        position: "relative",
        height: "10vh",
        minHeight: "480px",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
      }}
    >
      {/* ── Photo background avec parallax ── */}
      <div
        ref={bgRef}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, #0e0c09 0%, #17140f 40%, #0e0d0b 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(12,12,12,0.9) 0%, rgba(12,12,12,0.1) 60%)",
          }}
        />
      </div>

      {/* ── Citation ── */}
      <div
        className="wrap"
        style={{ position: "relative", zIndex: 1, padding: "4rem 3rem" }}
      >
        <blockquote
          data-reveal
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.8rem, 3.5vw, 3.5rem)",
            fontWeight: 200,
            color: "var(--blanc)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "1.5rem",
            maxWidth: "780px",
          }}
        >
          "{t("quote.main")}
          <br />
          <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
            {t("quote.highlight")}
          </em>
          "
        </blockquote>

        <p
          data-reveal
          data-delay="1"
          style={{ fontSize: "0.82rem", color: "var(--texte-2)", fontWeight: 400 }}
        >
          {t("author")}
        </p>
      </div>
    </section>
  )
}