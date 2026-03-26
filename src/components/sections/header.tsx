"use client"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { NAV_LINKS } from "@/lib/design-tokens"

export function Header() {
  const t = useTranslations('Header')
  const locale = useLocale()

  // Préfixe selon la locale : "" pour en (defaultLocale), "/fr", "/es" sinon
  const prefix = locale === "en" ? "" : `/${locale}`

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)

  // ... tous tes useEffect inchangés ...

  const handleNavClick = () => setMenuOpen(false)

  return (
    <>
      <header id="hdr" className={scrolled ? "scrolled" : ""}>
        <Link href={`${prefix}/`} className="logo">
          Anba<em>Chain</em>
        </Link>

        <nav className="hdr-nav">
          <ul>
            {NAV_LINKS.map(({ label, hash }) => (
              <li key={hash}>
                <Link href={`${prefix}/#${hash}`}>{t(`nav.${label}`)}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          ref={burgerRef}
          className={`hdr-burger${menuOpen ? " open" : ""}`}
          aria-label={menuOpen ? t("burger.close") : t("burger.open")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="hdr-burger-line hdr-burger-line-1" />
          <span className="hdr-burger-line hdr-burger-line-2" />
          <span className="hdr-burger-line hdr-burger-line-3" />
        </button>
      </header>

      <div
        ref={menuRef}
        className={`hdr-mobile-menu${menuOpen ? " open" : ""}`}
        role="navigation"
        aria-hidden={!menuOpen}
      >
        <div className="hdr-mobile-menu-inner">
          <ul>
            {NAV_LINKS.map(({ label, hash }) => (
              <li key={hash}>
                <Link
                  href={`${prefix}/#${hash}`}
                  className="hdr-mobile-nav-link"
                  onClick={handleNavClick}
                >
                  {t(`nav.${label}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}