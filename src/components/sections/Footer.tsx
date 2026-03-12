"use client";

import Link from "next/link"

/**
 * Footer
 * Grille 4 colonnes : brand + 3 colonnes liens.
 * Identique au #footer du HTML v3.
 */

const FOOTER_COLS = [
  {
    title: "Organisation",
    links: [
      { label: "Notre mission",    href: "#mission"      },
      { label: "Équipe fondatrice", href: "#equipe"      },
      { label: "Partenaires",      href: "#partenaires"  },
      { label: "Presse",           href: "#"             },
      { label: "Contact",          href: "#"             },
    ],
  },
  {
    title: "Réseau",
    links: [
      { label: "Événements (Lu.ma)", href: "#evenements" },
      { label: "Ressources",         href: "#ressources" },
      { label: "Adhésion",           href: "#adhesion"   },
      { label: "Espace membre",      href: "#"           },
      { label: "Forum",              href: "#"           },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Conditions d'utilisation",    href: "#" },
      { label: "Politique de confidentialité", href: "#" },
      { label: "Cookies",                      href: "#" },
      { label: "Remboursements",               href: "#" },
    ],
  },
]

export function Footer() {
  return (
    <footer
      id="footer"
      style={{
        background: "var(--bg-2)",
        borderTop: "1px solid var(--border)",
        padding: "5rem 3rem 2.5rem",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: "3rem",
          marginBottom: "4rem",
        }}
        className="footer-grid"
      >
        <div>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.2rem",
              fontWeight: 700,
              color: "var(--blanc)",
              display: "block",
              marginBottom: "1rem",
              letterSpacing: "-0.01em",
            }}
          >
            Anba<em style={{ fontStyle: "italic", fontWeight: 200, color: "var(--accent)" }}>Chain</em>
          </Link>
          <p style={{ fontSize: "0.83rem", color: "var(--texte)", maxWidth: "230px", lineHeight: 1.75 }}>
            Le réseau blockchain des professionnels noirs — réseautage, innovation et solutions au service de la communauté.
          </p>
        </div>

        {FOOTER_COLS.map(({ title, links }) => (
          <div key={title}>
            <div style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--texte)", marginBottom: "1.25rem" }}>
              {title}
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {links.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} style={{ fontSize: "0.84rem", color: "var(--texte)", transition: "color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--blanc)"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--texte)"}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "2rem", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: "1rem" }} className="footer-bottom">
        <p style={{ fontSize: "0.76rem", color: "var(--texte)" }}>© 2026 AnbaChain™ · Tous droits réservés</p>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {["Confidentialité", "CGU", "Contact"].map((label) => (
            <a key={label} href="#" style={{ fontSize: "0.76rem", color: "var(--texte)", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--blanc)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--texte)"}>
              {label}
            </a>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr !important; }
          .footer-bottom { flex-direction: column !important; text-align: center !important; }
          #footer { padding: 4rem 1.5rem 2rem !important; }
        }
      `}</style>
    </footer>
  )
}