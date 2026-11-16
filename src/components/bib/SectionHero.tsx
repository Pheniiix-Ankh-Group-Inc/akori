"use client"
import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*0123456789"

function scramble(el: HTMLElement, finalText: string, speed = 45) {
  el.innerHTML = ""
  const spans: HTMLSpanElement[] = []
  for (let i = 0; i < finalText.length; i++) {
    const s = document.createElement("span")
    s.textContent = finalText[i] === " " ? "\u00A0" : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
    if (finalText[i] !== " ") s.classList.add("scrambling")
    el.appendChild(s)
    spans.push(s)
  }
  spans.forEach((span, i) => {
    let iter = 0
    const finalChar = finalText[i]
    if (finalChar === " ") { span.textContent = "\u00A0"; return }
    const tick = window.setInterval(() => {
      if (iter >= 6 + i * 0.6) {
        span.textContent = finalChar
        span.classList.remove("scrambling")
        clearInterval(tick)
      } else {
        span.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        iter++
      }
    }, speed)
  })
}

export function SectionHero() {
  const t = useTranslations("Hero")
  const scrambleRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    scrambleRefs.current.forEach((el, i) => {
      if (!el) return
      const text = el.dataset.text || ""
      setTimeout(() => scramble(el, text), 200 + i * 350)
    })
  }, [])

  return (
    <section className="bib-hero" data-section="01" data-title="GENESIS">
      <div className="stars" />

      <svg className="moon" viewBox="0 0 100 100" aria-hidden>
        <defs>
          <radialGradient id="moonGrad" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#f5e6b8" />
            <stop offset="100%" stopColor="#d4a94a" />
          </radialGradient>
        </defs>
        <path d="M50 10 A40 40 0 1 0 50 90 A32 32 0 1 1 50 10 Z" fill="url(#moonGrad)" />
      </svg>

      <div className="meteor" aria-hidden />
      <div className="halo" aria-hidden />
      <svg className="halo-ring" viewBox="0 0 440 440" aria-hidden>
        <defs>
          <path id="ringPath" d="M 220, 220 m -200, 0 a 200,200 0 1,1 400,0 a 200,200 0 1,1 -400,0" />
        </defs>
        <text fontFamily="JetBrains Mono" fontSize="11" letterSpacing="6" fill="#0b0f1c" opacity="0.85">
          <textPath href="#ringPath">BLACK · IN · BLOCKCHAIN · COLLECTIVE · 2026 · BLACK · IN · BLOCKCHAIN · COLLECTIVE · 2026 ·&nbsp;</textPath>
        </text>
      </svg>

      <div className="bib-hero-content">
        <div className="bib-eyebrow">{t("eyebrow")}</div>
        <h1 className="bib-hero-title">
          <span
            className="outline bib-scramble"
            data-text={t("titleLine1")}
            ref={el => { scrambleRefs.current[0] = el }}
          >
            {t("titleLine1")}
          </span>
          <br />
          {t("titleLine2")} <em
            className="bib-scramble"
            data-text={t("titleLine3")}
            ref={el => { scrambleRefs.current[1] = el }}
          >
            {t("titleLine3")}
          </em>
        </h1>
      </div>

      <div className="bib-hero-bottom">
        <p className="bib-hero-lede">{t("lede")}</p>
        <div className="bib-hero-meta">
          <div><span>→</span> {t("meta1")}</div>
          <div><span>→</span> {t("meta2")}</div>
          <div><span>→</span> {t("meta3")}</div>
        </div>
      </div>

      <div className="bib-scroll-hint">{t("scroll")}</div>
    </section>
  )
}
