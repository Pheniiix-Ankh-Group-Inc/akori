"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { NAV_LINKS } from "@/lib/design-tokens"

/**
 * Header — Section 0
 * Fixe, transparent sur le hero.
 * Opaque + backdrop-blur au scroll > 30px.
 * Identique au #hdr / .scrolled du HTML v3.
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  const navLinkStyle: React.CSSProperties = {
    fontSize: "0.83rem",
    fontWeight: 400,
    color: "rgba(237,234,228,0.7)",
    transition: "color 0.2s",
    cursor: "pointer",
  }

  return (
    <>
      <header
        id="hdr"
        style={{
          position: "fixed",
          inset: "0 0 auto",
          zIndex: 500,
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: scrolled ? "rgba(12,12,12,0.88)" : "rgba(12,12,12,0)",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.07)"
            : "1px solid transparent",
          transition: "background 0.5s, border-bottom 0.5s",
          padding: "0 3rem",
        }}
      >
        {/* ── Logo ── */}
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--blanc)",
            letterSpacing: "-0.01em",
          }}
        >
          Afro
          <em style={{ fontStyle: "italic", fontWeight: 200, color: "var(--accent)" }}>
            Chain
          </em>
        </Link>

        {/* ── Nav desktop (masquée sur mobile via CSS) ── */}
        <nav className="hdr-nav">
          <ul style={{ display: "flex", gap: "2.5rem", listStyle: "none" }}>
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  style={navLinkStyle}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "var(--blanc)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "rgba(237,234,228,0.7)")
                  }
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Actions desktop ── */}
        <div className="hdr-actions" style={{ display: "flex", gap: "0.75rem" }}>
          <Button variant="ghost" href="/onboarding">Se connecter</Button>
          <Button variant="white" href="#adhesion">Rejoindre</Button>
        </div>

        {/* ── Burger mobile ── */}
        <button
          className="hdr-burger"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            width: "32px",
            height: "32px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "5px",
          }}
        >
          <span
            style={{
              display: "block",
              height: "1px",
              width: "24px",
              background: "var(--blanc)",
              transform: menuOpen ? "rotate(45deg) translateY(6px)" : "none",
              transition: "transform 0.3s var(--ease)",
            }}
          />
          <span
            style={{
              display: "block",
              height: "1px",
              width: "16px",
              background: "var(--blanc)",
              opacity: menuOpen ? 0 : 1,
              transition: "opacity 0.2s",
            }}
          />
          <span
            style={{
              display: "block",
              height: "1px",
              width: "24px",
              background: "var(--blanc)",
              transform: menuOpen ? "rotate(-45deg) translateY(-6px)" : "none",
              transition: "transform 0.3s var(--ease)",
            }}
          />
        </button>
      </header>

      {/* ── Menu mobile overlay ── */}
      <div
        className="hdr-mobile-menu"
        style={{
          position: "fixed",
          top: "64px",
          left: 0,
          right: 0,
          zIndex: 499,
          background: "rgba(12,12,12,0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
          maxHeight: menuOpen ? "480px" : "0",
          overflow: "hidden",
          transition: "max-height 0.4s var(--ease), opacity 0.3s",
          opacity: menuOpen ? 1 : 0,
        }}
      >
        <div style={{ padding: "1.5rem" }}>
          <ul style={{ listStyle: "none", marginBottom: "1.5rem" }}>
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "0.85rem 0",
                    fontSize: "0.9rem",
                    color: "rgba(237,234,228,0.7)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Button variant="ghost" href="/onboarding">Se connecter</Button>
            <Button variant="white" href="#adhesion">Rejoindre</Button>
          </div>
        </div>
      </div>

      {/* Styles responsive inline */}
      <style>{`
        @media (min-width: 769px) {
          .hdr-nav     { display: block; }
          .hdr-actions { display: flex !important; }
          .hdr-burger  { display: none !important; }
          .hdr-mobile-menu { display: none !important; }
        }
        @media (max-width: 768px) {
          .hdr-nav     { display: none !important; }
          .hdr-actions { display: none !important; }
          .hdr-burger  { display: flex !important; }
          #hdr         { padding: 0 1.5rem !important; }
        }
      `}</style>
    </>
  )
}