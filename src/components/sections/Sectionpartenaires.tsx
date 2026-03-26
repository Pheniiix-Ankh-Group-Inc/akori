"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import type { Partenaire } from "@/types"

const TABS = (t: any) => [
  { label: t("tabs.all"), value: "tous" },
  { label: t("tabs.entreprise"), value: "entreprise" },
  { label: t("tabs.institution"), value: "institution" },
  { label: t("tabs.universite"), value: "universite" },
  { label: t("tabs.media"), value: "media" },
]

interface Props {
  partenaires: Partenaire[] | null
}

export function SectionPartenaires({ partenaires }: Props) {
  const t = useTranslations("sectionPartenaires")

  const [activeTab, setActiveTab] = useState("tous")
  const data = partenaires ?? []

  const filtered = activeTab === "tous"
    ? data
    : data.filter((p) => p.type === activeTab)

  return (
    <section
      id="partners"
      style={{ padding: "var(--pad) 0", background: "var(--bg-2)" }}
    >
      {/* Top */}
      <div className="pt-header">
        <div>
          <span className="label" data-reveal>{t("label")}</span>
          <h2 className="heading-md" data-reveal data-delay="1">
            {t("title.main")} <em className="text-italic">{t("title.highlight")}</em>
          </h2>
        </div>

        {/* Tabs */}
        <div
          data-reveal
          className="pt-tabs"
        >
          {TABS(t).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "100px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 500,
                fontFamily: "var(--font-sans)",
                transition: "all 0.2s",
                background: activeTab === tab.value ? "var(--blanc)" : "transparent",
                color: activeTab === tab.value ? "var(--bg)" : "var(--texte)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="pt-empty">
          <p style={{ fontSize: "0.86rem", color: "var(--texte)" }}>
            {t("empty")}
          </p>
        </div>
      ) : (
        <div
          className="pt-grid"
          style={{
            borderTop: "1px solid var(--border)",
            borderLeft: "1px solid var(--border)",
          }}
        >
          {filtered.map((p, i) => (
            <div
              key={p._id}
              data-reveal
              data-delay={String((i % 4) + 1)}
              style={{
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                gap: "1.5rem",
                alignItems: "flex-start",
                transition: "background 0.3s",
                cursor: "default",
              }}
              className="pt-card"
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div style={{ width: "52px", height: "52px", flexShrink: 0, border: "1px solid var(--border)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 600, color: "var(--texte)", background: "rgba(255,255,255,0.02)" }}>
                {p.code ?? p.nom.slice(0, 3).toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", fontWeight: 700, color: "var(--blanc)", marginBottom: "0.3rem" }}>
                  {p.nom}
                </div>
                <div style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.75rem" }}>
                  {p.type}
                </div>
                {p.description && (
                  <p style={{ fontSize: "0.84rem", color: "var(--texte)", lineHeight: 1.7 }}>
                    {p.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        /* --- Mobile first (base) --- */
        .pt-header {
          padding: 0 1.5rem;
          margin-bottom: 3rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .pt-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0;
          border: 1px solid var(--border);
          border-radius: 100px;
          padding: 0.2rem;
        }

        .pt-empty {
          padding: 4rem 1.5rem;
          text-align: center;
        }

        .pt-grid {
          display: grid;
          grid-template-columns: 1fr;
        }

        .pt-card {
          padding: 2rem 1.5rem;
        }

        /* --- Tablet (≥ 768px) --- */
        @media (min-width: 768px) {
          .pt-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .pt-card {
            padding: 2.5rem 2rem;
          }
        }

        /* --- Desktop (≥ 1024px) --- */
        @media (min-width: 1024px) {
          .pt-header {
            padding: 0 3rem;
            margin-bottom: 4rem;
            flex-direction: row;
            align-items: flex-end;
          }

          .pt-empty {
            padding: 4rem 3rem;
          }

          .pt-card {
            padding: 2.5rem 3rem;
          }
        }
      `}</style>
    </section>
  )
}