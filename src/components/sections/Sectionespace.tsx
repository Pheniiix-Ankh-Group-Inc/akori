"use client"

import { useTranslations } from "next-intl"

// Clés statiques connues au build — pas de returnObjects
const FEATURE_KEYS = ["profile", "directory", "messaging", "library"] as const

const MOCK_STATS = [
  { val: "24", statKey: "connections" },
  { val: "3",  statKey: "events"      },
  { val: "12", statKey: "resources"   },
] as const

const MOCK_AVATARS = [
  "linear-gradient(135deg,#c4a46e,#7a5c2e)",
  "linear-gradient(135deg,#4a6e5c,#2e5c3a)",
  "linear-gradient(135deg,#5c4a6e,#3a2e5c)",
  "linear-gradient(135deg,#6e5c4a,#5c3a2e)",
]

export function SectionEspace() {
  const t = useTranslations("sectionEspace")

  return (
    <section
      id="espace"
      style={{ padding: "var(--pad) 0", background: "var(--bg-2)" }}
    >
      <div style={{ padding: "0 3rem" }} className="esp-wrap">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.3fr",
            gap: "7rem",
            alignItems: "center",
          }}
          className="esp-layout"
        >
          {/* ── Texte ── */}
          <div>
            <span
              data-reveal
              style={{
                display: "block",
                fontSize: "0.68rem",
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: "1.5rem",
              }}
            >
              {t("label")}
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
                fontSize: "clamp(2rem, 3.5vw, 3.5rem)",
                marginBottom: "1.75rem",
              }}
            >
              {t("title.main")}{" "}
              <em style={{ fontStyle: "italic", fontWeight: 200 }}>
                {t("title.highlight")}
              </em>
            </h2>

            <p
              data-reveal
              data-delay="2"
              style={{
                fontSize: "0.98rem",
                color: "var(--texte-2)",
                lineHeight: 1.85,
                fontWeight: 300,
                marginBottom: "1rem",
              }}
            >
              {t("desc")}
            </p>

            {/* Liste features */}
            <ul
              data-reveal
              data-delay="2"
              style={{
                listStyle: "none",
                borderTop: "1px solid var(--border)",
                margin: "2.5rem 0",
              }}
            >
              {FEATURE_KEYS.map((key, i) => (
                <li
                  key={key}
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    alignItems: "flex-start",
                    padding: "1.25rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "0.85rem",
                      color: "var(--accent)",
                      opacity: 0.5,
                      flexShrink: 0,
                      width: "22px",
                      marginTop: "0.1rem",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        color: "var(--blanc)",
                        marginBottom: "0.2rem",
                      }}
                    >
                      {t(`features.${key}.title`)}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "var(--texte)" }}>
                      {t(`features.${key}.desc`)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Mockup dashboard ── */}
          <div
            data-reveal
            data-delay="2"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "0 50px 100px rgba(0,0,0,0.55)",
            }}
          >
            {/* Barre OS */}
            <div
              style={{
                height: "42px",
                background: "rgba(255,255,255,0.025)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                padding: "0 1.25rem",
                gap: "0.45rem",
              }}
            >
              {["#ff5f57", "#ffbd2e", "#28c840"].map((color) => (
                <div
                  key={color}
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: color,
                  }}
                />
              ))}
              <div
                style={{
                  flex: 1,
                  marginLeft: "0.75rem",
                  height: "20px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "100px",
                  fontSize: "0.6rem",
                  color: "var(--texte)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 0.75rem",
                }}
              >
                {t("dashboardUrl")}
              </div>
            </div>

            {/* Stats */}
            <div style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.75rem",
                  marginBottom: "1.5rem",
                }}
              >
                {MOCK_STATS.map(({ val, statKey }) => (
                  <div
                    key={statKey}
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid var(--border)",
                      borderRadius: "4px",
                      padding: "1rem",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "1.6rem",
                        fontWeight: 200,
                        color: "var(--accent)",
                        lineHeight: 1,
                      }}
                    >
                      {val}
                    </div>
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--texte)",
                        marginTop: "0.3rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {t(`stats.${statKey}`)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Membres suggérés */}
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--texte)",
                  marginBottom: "0.75rem",
                }}
              >
                {t("suggestedMembers")}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {MOCK_AVATARS.map((bg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.6rem 0.75rem",
                      background: "rgba(255,255,255,0.018)",
                      borderRadius: "4px",
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: bg,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", flex: i % 2 === 0 ? 1 : 0.6 }} />
                    <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", flex: 0.3 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .esp-layout { grid-template-columns: 1fr !important; gap: 4rem !important; }
          .esp-wrap { padding: 0 1.5rem !important; }
        }
      `}</style>
    </section>
  )
}