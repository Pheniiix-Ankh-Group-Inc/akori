"use client"

import { useEffect, useState } from "react"

/**
 * Repère discret des scènes de State of BIB (desktop) : un trait par scène,
 * la scène visible est mise en évidence. Simple lien d'ancre, aucun contrôle
 * du défilement.
 */
export function SceneIndex({ scenes, label }: { scenes: { id: string; label: string }[]; label: string }) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting)
        if (v[0]) setActive(v[0].target.id)
      },
      { rootMargin: "-40% 0px -55% 0px" },
    )
    scenes.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [scenes])
  return (
    <nav className="sob-scenes" aria-label={label}>
      {scenes.map((s) => (
        <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? "true" : undefined}>
          <span>{s.label}</span>
        </a>
      ))}
    </nav>
  )
}
