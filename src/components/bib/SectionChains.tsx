"use client"
import { useTranslations } from "next-intl"
import { useBibStaggerReveal } from "./useBibReveal"

const CHAINS = [
  { key: "eth", color: "#627eea", logo: (
    <>
      <polygon points="24,4 38,24 24,30 10,24" fill="#627eea" opacity="0.6" />
      <polygon points="24,4 38,24 24,30" fill="#627eea" />
      <polygon points="24,34 38,26 24,44 10,26" fill="#627eea" opacity="0.85" />
      <polygon points="24,34 38,26 24,44" fill="#627eea" />
    </>
  )},
  { key: "sol", color: "#9945ff", logo: (
    <>
      <defs>
        <linearGradient id="solGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14f195" />
          <stop offset="100%" stopColor="#9945ff" />
        </linearGradient>
      </defs>
      <path d="M8 14 L40 14 L44 10 L12 10 Z" fill="url(#solGrad)" />
      <path d="M8 26 L40 26 L44 22 L12 22 Z" fill="url(#solGrad)" />
      <path d="M8 38 L40 38 L44 34 L12 34 Z" fill="url(#solGrad)" />
    </>
  )},
  { key: "base", color: "#0052ff", logo: (
    <>
      <circle cx="24" cy="24" r="20" fill="none" stroke="#0052ff" strokeWidth="3" />
      <path d="M 24 8 A 16 16 0 0 0 24 40 L 24 24 Z" fill="#0052ff" />
    </>
  )},
  { key: "btc", color: "#f7931a", logo: (
    <>
      <circle cx="24" cy="24" r="20" fill="#f7931a" />
      <text x="24" y="33" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="28" fill="#fff">₿</text>
    </>
  )},
  { key: "poly", color: "#8247e5", logo: (
    <>
      <polygon points="24,6 40,15 40,33 24,42 8,33 8,15" fill="none" stroke="#8247e5" strokeWidth="2.5" />
      <polygon points="24,14 32,19 32,29 24,34 16,29 16,19" fill="#8247e5" />
    </>
  )},
  { key: "celo", color: "#35d07f", logo: (
    <>
      <circle cx="18" cy="24" r="12" fill="none" stroke="#fbcc5c" strokeWidth="2.5" />
      <circle cx="30" cy="24" r="12" fill="none" stroke="#35d07f" strokeWidth="2.5" />
    </>
  )},
  { key: "stellar", color: "#14b7fd", logo: (
    <>
      <circle cx="24" cy="24" r="20" fill="none" stroke="#14b7fd" strokeWidth="2.5" />
      <path d="M 10 18 L 38 22 L 10 30 L 38 26 Z" fill="#14b7fd" opacity="0.85" />
    </>
  )},
  { key: "arb", color: "#28a0f0", logo: (
    <>
      <circle cx="24" cy="24" r="20" fill="none" stroke="#28a0f0" strokeWidth="2.5" />
      <path d="M 24 10 L 35 35 L 30 35 L 24 20 L 18 35 L 13 35 Z" fill="#28a0f0" />
    </>
  )},
] as const

export function SectionChains() {
  const t = useTranslations("Chains")
  const gridRef = useBibStaggerReveal<HTMLDivElement>({
    childSelector: ".bib-chain-card",
    from: { opacity: 0, translateY: 30 },
    step: 80,
  })

  return (
    <section className="bib-chains" id="chains" data-section="11" data-title="BY CHAIN">
      <div className="bib-chains-container">
        <div className="bib-chains-head">
          <div>
            <div className="bib-eyebrow">{t("eyebrow")}</div>
            <h2 className="bib-chains-title" dangerouslySetInnerHTML={{ __html: t.raw("title") }} />
          </div>
          <p className="bib-chains-intro">{t("intro")}</p>
        </div>

        <div className="bib-chain-grid" ref={gridRef}>
          {CHAINS.map(({ key, color, logo }) => (
            <div
              key={key}
              className="bib-chain-card"
              style={{ "--chain-color": color } as React.CSSProperties}
              data-hover
            >
              <svg className="bib-chain-logo" viewBox="0 0 48 48">{logo}</svg>
              <div className="bib-chain-tag">{t(`items.${key}.tag`)}</div>
              <h3
                className="bib-chain-name"
                dangerouslySetInnerHTML={{ __html: t.raw(`items.${key}.name`) }}
              />
              <div className="bib-chain-stats">
                <div className="row"><span>{t("members")}</span><b>{t(`items.${key}.members`)}</b></div>
                <div className="row"><span>{t("channels")}</span><b>{t(`items.${key}.channels`)}</b></div>
                <div className="row"><span>{t("nextCall")}</span><b>{t(`items.${key}.next`)}</b></div>
              </div>
              <div className="bib-chain-cta">{t("cta")}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
