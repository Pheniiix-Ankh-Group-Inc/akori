"use client"

import { useEffect, useState } from "react"

type Entry = { id: string; label: string }

const slug = (s: string, i: number) =>
  `s-${i + 1}-${s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)}`

/**
 * Sommaire des documents juridiques. Il lit les titres déjà rendus
 * (.lg-doc .legal-heading) sans toucher au texte, leur donne une ancre
 * stable si elles n'en ont pas, et signale la section visible. Sans
 * JavaScript, le document reste complet ; seul le sommaire manque.
 */
export function LegalToc({ label }: { label: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const headings = Array.from(document.querySelectorAll<HTMLElement>(".lg-doc .legal-heading"))
    const list = headings.map((h, i) => {
      if (!h.id) h.id = slug(h.textContent ?? "", i)
      return { id: h.id, label: (h.textContent ?? "").trim() }
    })
    const raf = requestAnimationFrame(() => setEntries(list))
    if (typeof IntersectionObserver === "undefined") return () => cancelAnimationFrame(raf)
    const io = new IntersectionObserver(
      (es) => {
        const visible = es.filter((e) => e.isIntersecting)
        if (visible[0]) setActive((visible[0].target as HTMLElement).id)
      },
      { rootMargin: "-15% 0px -70% 0px" },
    )
    headings.forEach((h) => io.observe(h))
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [])

  // Repliée par défaut (pas de décalage du texte sur mobile quand la liste
  // arrive) ; ouverte sur grand écran, où le sommaire a sa propre colonne.
  return (
    <nav className="lg-toc" aria-label={label}>
      <details ref={(el) => { if (el && !el.dataset.init && window.matchMedia("(min-width: 1280px)").matches) { el.open = true; el.dataset.init = "1" } }}>
        <summary className="im-ey">{label}</summary>
        <ol>
          {entries.map((e) => (
            <li key={e.id}>
              <a href={`#${e.id}`} aria-current={active === e.id ? "true" : undefined}>
                {e.label}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  )
}
