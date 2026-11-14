"use client"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

const NAV = [
  { key: "about", href: "/fondateurs" },
  { key: "events", href: "/evenements" },
  { key: "inAction", href: "/en-action" },
  { key: "stateOfBib", href: "/state_of_bib" },
] as const

/** En-tête du site public : menu principal, langues FR/EN/ES, abonnement. */
export function Header() {
  const t = useTranslations("Site.nav")
  const locale = useLocale()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const languages = (
    <div className="ed-lang" role="group" aria-label={t("language")}>
      {routing.locales.map((l) => (
        <Link key={l} href={pathname} locale={l} aria-current={l === locale ? "true" : undefined} hrefLang={l}>
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  )

  return (
    <header className="ed-header">
      <div className="ed-header-inner">
        <Link href="/" className="ed-logo">
          Black <em>in</em> Blockchain
        </Link>

        <nav className="ed-nav" aria-label={t("main")}>
          {NAV.map((item) => (
            <Link key={item.key} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ed-header-tools">
          {languages}
          <Link href="/#newsletter" className="ed-btn ed-btn-dark">
            {t("subscribe")}
          </Link>
        </div>

        <button
          type="button"
          className="ed-burger"
          aria-label={open ? t("close") : t("open")}
          aria-expanded={open}
          aria-controls="ed-mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d={open ? "M5 5 L15 15 M15 5 L5 15" : "M3 6 H17 M3 10 H17 M3 14 H17"} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <nav id="ed-mobile-menu" className={`ed-mobile${open ? " open" : ""}`} aria-label={t("main")} hidden={!open}>
        {NAV.map((item) => (
          <Link key={item.key} href={item.href} className="ed-mobile-link" onClick={close} aria-current={isCurrent(item.href) ? "page" : undefined}>
            {t(item.key)}
          </Link>
        ))}
        {languages}
        <Link href="/#newsletter" className="ed-btn ed-btn-dark" onClick={close}>
          {t("subscribeLong")}
        </Link>
      </nav>
    </header>
  )
}
