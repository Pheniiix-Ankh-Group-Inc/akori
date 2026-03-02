"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"

/**
 * SectionPartenaires — Section 4
 * Tabs pills pour filtrer.
 * Grille partenaires en tableau avec séparateurs.
 * Bannière CTA "Devenir partenaire".
 * Identique au #partenaires du HTML v3.
 */

const TABS = ["Entreprises", "Institutions", "Universités", "Médias"] as const

const PARTNERS = [
  {
    code: "ENT",
    name: "[Nom Entreprise]",
    type: "Fintech · Partenaire",
    desc: "Description du partenaire et de son rôle dans l'écosystème blockchain de la communauté.",
  },
  {
    code: "INS",
    name: "[Nom Institution]",
    type: "Institution publique",
    desc: "Partenaire institutionnel accompagnant le développement des politiques blockchain.",
  },
  {
    code: "UNI",
    name: "[Université]",
    type: "Recherche & Éducation",
    desc: "Centre de recherche spécialisé en technologies distribuées et gouvernance numérique.",
  },
  {
    code: "VC",
    name: "[Fonds d'investissement]",
    type: "Capital-risque · Web3",
    desc: "Soutient les startups blockchain fondées par des entrepreneurs noirs.",
  },
]

export function SectionPartenaires() {
  const [activeTab, setActiveTab] = useState<string>("Entreprises")

  return (
    <section
      id="partenaires"
      style={{ padding: "var(--pad) 0", background: "var(--bg-2)" }}
    >
      {/* ── Top : titre + tabs ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "5rem",
          padding: "0 3rem",
          flexWrap: "wrap",
          gap: "1.5rem",
        }}
      >
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
            Écosystème
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
            }}
          >
            Partenaires &{" "}
            <em style={{ fontStyle: "italic", fontWeight: 200 }}>Institutions</em>
          </h2>
        </div>

        {/* Tabs pills */}
        <div
          style={{
            display: "flex",
            gap: 0,
            border: "1px solid var(--border)",
            borderRadius: "100px",
            padding: "0.2rem",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: "0.78rem",
                fontWeight: activeTab === tab ? 500 : 400,
                padding: "0.45rem 1.2rem",
                borderRadius: "100px",
                border: "none",
                background: activeTab === tab ? "var(--blanc)" : "transparent",
                color: activeTab === tab ? "var(--bg)" : "var(--texte)",
                cursor: "pointer",
                transition: "all 0.25s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grille partenaires ── */}
      <div
        data-reveal
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          borderTop: "1px solid var(--border)",
          borderLeft: "1px solid var(--border)",
        }}
        className="partners-grid"
      >
        {PARTNERS.map(({ code, name, type, desc }, i) => (
          <div
            key={code}
            style={{
              display: "flex",
              gap: "1.5rem",
              alignItems: "flex-start",
              padding: "2.5rem 3rem",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              transition: "background 0.3s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.02)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "")
            }
          >
            {/* Logo placeholder */}
            <div
              style={{
                width: "52px",
                height: "52px",
                flexShrink: 0,
                border: "1px solid var(--border)",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "var(--texte)",
                letterSpacing: "0.05em",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              {code}
            </div>

            <div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "var(--blanc)",
                  marginBottom: "0.2rem",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  marginBottom: "0.5rem",
                }}
              >
                {type}
              </div>
              <div style={{ fontSize: "0.84rem", color: "var(--texte)", lineHeight: 1.65 }}>
                {desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bannière "Devenir partenaire" ── */}
      <div
        data-reveal
        style={{
          margin: "3rem",
          padding: "2.5rem 3rem",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "2rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.3rem",
              fontWeight: 700,
              color: "var(--blanc)",
              marginBottom: "0.3rem",
            }}
          >
            Rejoindre l'écosystème AfroChain
          </h3>
          <p style={{ fontSize: "0.86rem", color: "var(--texte)" }}>
            Entreprise, institution, université ou fonds — construisons ensemble.
          </p>
        </div>
        <Button variant="accent" href="#">Devenir partenaire</Button>
      </div>
    </section>
  )
}