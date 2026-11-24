"use client"
import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

// Landing page : les trois premières entrées font défiler l'accueil jusqu'à
// leur section ; State of BIB reste une page à part entière.
const NAV = [
  { key: "about", href: "/#a-propos", section: "a-propos" },
  { key: "events", href: "/#evenements", section: "evenements" },
  { key: "spotlight", href: "/startup-spotlight", section: null },
  { key: "inAction", href: "/#en-action", section: "en-action" },
  { key: "stateOfBib", href: "/state_of_bib", section: null },
] as const

/** Section de l'accueil actuellement à l'écran (pour souligner l'entrée du menu). */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return
    const els = NAV.flatMap((n) => (n.section ? [document.getElementById(n.section)] : [])).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: "-45% 0px -50% 0px" },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [enabled])
  return enabled ? active : null
}

/** En-tête du site public : menu principal, langues FR/EN/ES, abonnement. */
export function Header() {
  const t = useTranslations("Site.nav")
  const locale = useLocale()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  const active = useActiveSection(pathname === "/")
  const currentOf = (item: (typeof NAV)[number]) =>
    item.section ? (active === item.section ? "location" : undefined) : pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined

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
            <Link key={item.key} href={item.href} aria-current={currentOf(item)}>
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
          <Link key={item.key} href={item.href} className="ed-mobile-link" onClick={close} aria-current={currentOf(item)}>
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
