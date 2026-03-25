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
      <div style={{ padding: "0 3rem", marginBottom: "4rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="label" data-reveal>{t("label")}</span>
          <h2 className="heading-md" data-reveal data-delay="1">
            {t("title.main")} <em className="text-italic">{t("title.highlight")}</em>
          </h2>
        </div>

        {/* Tabs */}
        <div
          data-reveal
          style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: "100px", padding: "0.2rem" }}
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
        <div style={{ padding: "4rem 3rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.86rem", color: "var(--texte)" }}>
            {t("empty")}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            borderTop: "1px solid var(--border)",
            borderLeft: "1px solid var(--border)",
          }}
          className="partners-grid"
        >
          {filtered.map((p, i) => (
            <div
              key={p._id}
              data-reveal
              data-delay={String((i % 4) + 1)}
              style={{
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                padding: "2.5rem 3rem",
                display: "flex",
                gap: "1.5rem",
                alignItems: "flex-start",
                transition: "background 0.3s",
                cursor: "default",
              }}
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
        @media (max-width: 1024px) {
          .partners-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}