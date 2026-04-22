import { useTranslations } from "next-intl"

function BuilderSVG() {
  return (
    <svg className="bib-portrait-svg" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="p1sun" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#f4c54a" />
          <stop offset="60%" stopColor="#e8a836" />
          <stop offset="100%" stopColor="#c7382c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="p1bust" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1810" />
          <stop offset="100%" stopColor="#0b0f1c" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="#e8a836" />
      <rect width="400" height="500" fill="url(#p1sun)" opacity="0.6" />
      <circle cx="60" cy="80" r="1.5" fill="#0b0f1c" opacity="0.4" />
      <circle cx="340" cy="120" r="2" fill="#0b0f1c" opacity="0.5" />
      <circle cx="50" cy="200" r="1" fill="#0b0f1c" opacity="0.4" />
      <circle cx="360" cy="280" r="1.5" fill="#0b0f1c" opacity="0.4" />
      <circle cx="80" cy="420" r="1" fill="#0b0f1c" opacity="0.3" />
      <circle cx="200" cy="220" r="140" fill="#f4c54a" opacity="0.95" />
      <circle cx="200" cy="220" r="140" fill="none" stroke="#0b0f1c" strokeWidth="1" opacity="0.3" />
      <g stroke="#0b0f1c" strokeWidth="1.5" opacity="0.7">
        <line x1="200" y1="60" x2="200" y2="90" />
        <line x1="130" y1="100" x2="148" y2="122" />
        <line x1="270" y1="100" x2="252" y2="122" />
        <line x1="90" y1="160" x2="115" y2="175" />
        <line x1="310" y1="160" x2="285" y2="175" />
        <line x1="70" y1="230" x2="100" y2="230" />
        <line x1="330" y1="230" x2="300" y2="230" />
      </g>
      <circle cx="200" cy="80" r="3" fill="#0b0f1c" />
      <circle cx="140" cy="108" r="2" fill="#0b0f1c" />
      <circle cx="260" cy="108" r="2" fill="#0b0f1c" />
      <circle cx="95" cy="165" r="2" fill="#0b0f1c" />
      <circle cx="305" cy="165" r="2" fill="#0b0f1c" />
      <path d="M 200 140 C 160 140, 145 175, 145 210 C 145 240, 160 265, 180 275 L 175 300 C 120 305, 80 335, 70 400 L 70 500 L 330 500 L 330 400 C 320 335, 280 305, 225 300 L 220 275 C 240 265, 255 240, 255 210 C 255 175, 240 140, 200 140 Z" fill="url(#p1bust)" />
      <circle cx="145" cy="235" r="6" fill="#f4c54a" stroke="#0b0f1c" strokeWidth="1" />
      <circle cx="200" cy="220" r="4" fill="#c7382c" />
    </svg>
  )
}

function ResearcherSVG() {
  return (
    <svg className="bib-portrait-svg" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="p2planet" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#e8a836" />
          <stop offset="70%" stopColor="#c7382c" />
          <stop offset="100%" stopColor="#5a0e00" />
        </radialGradient>
        <linearGradient id="p2bust" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a0800" />
          <stop offset="100%" stopColor="#0b0f1c" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="#c7382c" />
      <rect width="400" height="500" fill="#9a2818" opacity="0.5" />
      <circle cx="80" cy="60" r="1" fill="#f2ece0" opacity="0.6" />
      <circle cx="320" cy="90" r="1.5" fill="#f2ece0" opacity="0.7" />
      <circle cx="60" cy="150" r="1" fill="#f2ece0" opacity="0.5" />
      <circle cx="340" cy="200" r="1" fill="#f2ece0" opacity="0.4" />
      <circle cx="50" cy="380" r="1.5" fill="#f2ece0" opacity="0.5" />
      <circle cx="360" cy="430" r="1" fill="#f2ece0" opacity="0.4" />
      <circle cx="200" cy="200" r="130" fill="url(#p2planet)" />
      <ellipse cx="200" cy="210" rx="170" ry="20" fill="none" stroke="#0b0f1c" strokeWidth="1" opacity="0.4" />
      <ellipse cx="200" cy="210" rx="170" ry="20" fill="none" stroke="#f4c54a" strokeWidth="0.5" opacity="0.6" />
      <g fill="#0b0f1c" opacity="0.85">
        <rect x="195" y="68" width="10" height="20" />
        <rect x="170" y="80" width="6" height="14" />
        <rect x="220" y="80" width="6" height="14" />
      </g>
      <circle cx="200" cy="65" r="4" fill="#f4c54a" />
      <path d="M 200 130 C 155 130, 140 170, 140 210 C 140 240, 155 268, 178 278 L 172 305 C 110 310, 75 345, 65 410 L 65 500 L 335 500 L 335 410 C 325 345, 290 310, 228 305 L 222 278 C 245 268, 260 240, 260 210 C 260 170, 245 130, 200 130 Z" fill="url(#p2bust)" />
      <path d="M 168 195 L 232 195 L 232 210 Q 200 218 168 210 Z" fill="#f4c54a" opacity="0.9" />
      <line x1="168" y1="203" x2="232" y2="203" stroke="#c7382c" strokeWidth="1" />
      <circle cx="145" cy="235" r="5" fill="#f4c54a" />
      <circle cx="255" cy="235" r="5" fill="#f4c54a" />
      <line x1="160" y1="320" x2="240" y2="320" stroke="#f4c54a" strokeWidth="1" opacity="0.6" />
    </svg>
  )
}

function FounderSVG() {
  return (
    <svg className="bib-portrait-svg" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="p3moon" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#f5e6b8" />
          <stop offset="100%" stopColor="#e8a836" />
        </radialGradient>
        <linearGradient id="p3bust" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1020" />
          <stop offset="100%" stopColor="#000" />
        </linearGradient>
        <radialGradient id="p3glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#4a7fd4" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#12274f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill="#12274f" />
      <rect width="400" height="500" fill="url(#p3glow)" />
      <ellipse cx="120" cy="350" rx="120" ry="40" fill="#2d5cc9" opacity="0.3" />
      <ellipse cx="290" cy="400" rx="100" ry="30" fill="#4a7fd4" opacity="0.25" />
      <g fill="#f2ece0">
        <circle cx="50" cy="70" r="1" />
        <circle cx="100" cy="40" r="1.5" />
        <circle cx="350" cy="60" r="1" />
        <circle cx="380" cy="130" r="1.5" />
        <circle cx="30" cy="180" r="1" />
        <circle cx="370" cy="220" r="1" />
        <circle cx="60" cy="300" r="1.5" />
        <circle cx="340" cy="340" r="1" />
        <circle cx="20" cy="400" r="1" />
        <circle cx="380" cy="450" r="1.5" />
        <circle cx="150" cy="100" r="0.8" opacity="0.7" />
        <circle cx="260" cy="130" r="0.8" opacity="0.7" />
      </g>
      <circle cx="200" cy="210" r="155" fill="none" stroke="#4a7fd4" strokeWidth="0.5" opacity="0.4" />
      <circle cx="200" cy="210" r="175" fill="none" stroke="#4a7fd4" strokeWidth="0.3" opacity="0.3" />
      <circle cx="200" cy="210" r="125" fill="url(#p3moon)" />
      <circle cx="170" cy="180" r="8" fill="#d4a94a" opacity="0.4" />
      <circle cx="230" cy="200" r="5" fill="#d4a94a" opacity="0.3" />
      <circle cx="215" cy="250" r="10" fill="#d4a94a" opacity="0.35" />
      <g fill="#f4c54a">
        <polygon points="200,58 203,70 215,72 205,80 208,92 200,85 192,92 195,80 185,72 197,70" />
        <polygon points="150,88 152,96 160,97 154,103 156,111 150,107 144,111 146,103 140,97 148,96" />
        <polygon points="250,88 252,96 260,97 254,103 256,111 250,107 244,111 246,103 240,97 248,96" />
      </g>
      <path d="M 200 130 C 155 130, 138 172, 138 212 C 138 242, 155 270, 178 280 L 172 305 C 105 310, 70 345, 60 420 L 60 500 L 340 500 L 340 420 C 330 345, 295 310, 228 305 L 222 280 C 245 270, 262 242, 262 212 C 262 172, 245 130, 200 130 Z" fill="url(#p3bust)" />
      <path d="M 160 320 Q 200 340 240 320" fill="none" stroke="#f4c54a" strokeWidth="1.5" opacity="0.8" />
      <circle cx="200" cy="335" r="3" fill="#f4c54a" />
      <circle cx="142" cy="240" r="4" fill="#f4c54a" />
      <circle cx="258" cy="240" r="4" fill="#f4c54a" />
      <line x1="142" y1="244" x2="142" y2="256" stroke="#f4c54a" strokeWidth="1" />
      <line x1="258" y1="244" x2="258" y2="256" stroke="#f4c54a" strokeWidth="1" />
    </svg>
  )
}

const CARDS = [
  { key: "p1", bg: "#e8a836", SVG: BuilderSVG },
  { key: "p2", bg: "#c7382c", SVG: ResearcherSVG },
  { key: "p3", bg: "#12274f", SVG: FounderSVG },
] as const

export function SectionPortraits() {
  const t = useTranslations("Portraits")

  return (
    <section className="bib-portraits" id="voices" data-section="10" data-title="THE PORTRAITS">
      <div className="bib-portraits-head">
        <div>
          <div className="bib-eyebrow">{t("eyebrow")}</div>
          <h2 className="bib-portraits-title" dangerouslySetInnerHTML={{ __html: t.raw("title") }} />
        </div>
        <div className="bib-hero-meta" style={{ textAlign: "right" }}>
          <div><span>—</span> {t("meta1")}</div>
          <div><span>—</span> {t("meta2")}</div>
          <div><span>—</span> {t("meta3")}</div>
        </div>
      </div>

      <div className="bib-portrait-grid">
        {CARDS.map(({ key, bg, SVG }) => (
          <div
            key={key}
            className="bib-portrait-card"
            style={{ "--pbg": bg } as React.CSSProperties}
            data-hover
          >
            <SVG />
            <div className="bib-portrait-body">
              <div className="bib-portrait-num">{t(`items.${key}.num`)}</div>
              <p className="bib-portrait-quote">{t(`items.${key}.quote`)}</p>
              <div
                className="bib-portrait-name"
                dangerouslySetInnerHTML={{ __html: t.raw(`items.${key}.name`) }}
              />
              <div className="bib-portrait-role">{t(`items.${key}.role`)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
