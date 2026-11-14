"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const ITEMS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/evenements", label: "Événements" },
  { href: "/admin/en-action", label: "BIB en action" },
  { href: "/admin/medias", label: "Médias" },
  { href: "/admin/temoignages", label: "Témoignages" },
  { href: "/admin/insights", label: "Insights State of BIB" },
  { href: "/admin/newsletter", label: "Newsletter (suivi)" },
] as const

/** Menu de l'administration ; la rubrique courante est signalée (aria-current). */
export function AdminNav() {
  const pathname = usePathname()
  const current = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`))
  return (
    <nav className="member-sidebar-nav" aria-label="Rubriques">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} className="member-nav-link" aria-current={current(i.href) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  )
}
