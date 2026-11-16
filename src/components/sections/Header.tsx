"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"

type NavItem =
  | { key: "manifesto" | "chapters" | "work" | "chains" | "gathering"; hash: string }
  | { key: "stateOfBib"; route: string }

const NAV: readonly NavItem[] = [
  { key: "manifesto", hash: "manifesto" },
  { key: "chapters", hash: "chapters" },
  { key: "work", hash: "pillars" },
  { key: "chains", hash: "chains" },
  { key: "gathering", hash: "gathering" },
  { key: "stateOfBib", route: "/state_of_bib" },
] as const

export function Header() {
  const t = useTranslations("Nav")
  const locale = useLocale()
  const prefix = locale === "en" ? "" : `/${locale}`
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      <nav className="bib-nav" aria-label="Primary">
        <Link href={`${prefix}/`} className="bib-logo" onClick={() => setOpen(false)}>
          Black <em>in</em> <b>Blockchain</b>
        </Link>

        <ul className="bib-nav-links">
          {NAV.map((item) => {
            const href = "route" in item ? `${prefix}${item.route}` : `${prefix}/#${item.hash}`
            return (
              <li key={item.key}>
                <Link href={href}>{t(item.key)}</Link>
              </li>
            )
          })}
        </ul>

        <Link href={`${prefix}/#join`} className="bib-nav-cta">
          {t("cta")}
        </Link>

        <button
          type="button"
          className={`bib-nav-burger${open ? " open" : ""}`}
          aria-label={open ? t("close") : t("open")}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <span /><span /><span />
        </button>
      </nav>

      <div className={`bib-nav-mobile${open ? " open" : ""}`} aria-hidden={!open}>
        {NAV.map((item) => {
          const href = "route" in item ? `${prefix}${item.route}` : `${prefix}/#${item.hash}`
          return (
            <Link
              key={item.key}
              href={href}
              onClick={() => setOpen(false)}
            >
              {t(item.key)}
            </Link>
          )
        })}
        <Link
          href={`${prefix}/#join`}
          className="bib-nav-cta"
          onClick={() => setOpen(false)}
        >
          {t("cta")}
        </Link>
      </div>
    </>
  )
}
