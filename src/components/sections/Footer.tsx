"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher"

const FOOTER_COLS = [
  {
    key: "organisation",
    links: [
      { key: "mission",  href: "/mission"  },
      { key: "team",     href: "/team"     },
      { key: "partners", href: "/partners" },
    ],
  },
  {
    key: "reseau",
    links: [
      { key: "events",     href: "/events"     },
      { key: "resources",  href: "/resources"  },
      { key: "membership", href: "/membership" },
    ],
  },
  {
    key: "legal",
    links: [
      { key: "terms",   href: "/terms"   },
      { key: "privacy", href: "/privacy" },
      { key: "cookies", href: "/cookies" },
    ],
  },
] as const

const LEGAL_LINKS = [
  { key: "privacy", href: "/privacy" },
  { key: "cgu",     href: "/terms"   },
  { key: "contact", href: "/contact" },
] as const

export function Footer() {
  const t = useTranslations("Footer")

  return (
    <footer id="footer" className="footer-root">

      {/* ── Grille principale ── */}
      <div className="footer-grid">

        {/* Brand */}
        <div>
          <Link href="/" className="footer-brand">
            Anba<em className="footer-brand-em">Chain</em>
          </Link>
          <p className="footer-brand-desc">
            {t("brand.description")}
          </p>
        </div>

        {/* Colonnes liens */}
        {FOOTER_COLS.map(({ key: colKey, links }) => (
          <div key={colKey}>
            <div className="footer-col-title">
              {t(`cols.${colKey}.title`)}
            </div>
            <ul className="footer-col-links">
              {links.map(({ key: linkKey, href }) => (
                <li key={linkKey}>
                  <Link href={href} className="footer-link">
                    {t(`cols.${colKey}.${linkKey}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Bottom bar ── */}
      <div className="footer-bottom">

        {/* Copyright */}
        <p className="footer-copyright">
          {t("bottom.copyright")}
        </p>

        {/* Liens légaux + sélecteur de langue */}
        <div className="footer-bottom-right">
          {LEGAL_LINKS.map(({ key, href }) => (
            <Link key={key} href={href} className="footer-link footer-legal-link">
              {t(`bottom.${key}`)}
            </Link>
          ))}
          <LocaleSwitcher />
        </div>

      </div>

      <style>{`
        .footer-root {
          background: var(--bg-2);
          border-top: 1px solid var(--border);
          padding: 5rem 3rem 2.5rem;
        }

        /* Grille */
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 3rem;
          margin-bottom: 4rem;
        }

        /* Brand */
        .footer-brand {
          font-family: var(--font-serif);
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--blanc);
          display: block;
          margin-bottom: 1rem;
          letter-spacing: -0.01em;
          text-decoration: none;
        }
        .footer-brand-em {
          font-style: italic;
          font-weight: 200;
          color: var(--accent);
        }
        .footer-brand-desc {
          font-size: 0.83rem;
          color: var(--texte);
          max-width: 230px;
          line-height: 1.75;
        }

        /* Colonnes */
        .footer-col-title {
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--texte);
          margin-bottom: 1.25rem;
        }
        .footer-col-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        /* Liens partagés */
        .footer-link {
          font-size: 0.84rem;
          color: var(--texte);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-link:hover { color: var(--blanc); }

        /* Bottom bar */
        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 2rem;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
          gap: 1rem;
        }
        .footer-copyright {
          font-size: 0.76rem;
          color: var(--texte);
        }
        .footer-bottom-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .footer-legal-link {
          font-size: 0.76rem;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .footer-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 768px) {
          .footer-root  { padding: 4rem 1.5rem 2rem; }
          .footer-grid  { grid-template-columns: 1fr; }
          .footer-bottom {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .footer-bottom-right {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </footer>
  )
} 