"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * Apparition discrète au défilement (fondu + montée de 12 px, 480 ms).
 *
 * Le contenu est rendu visible côté serveur : l'effet n'est activé qu'après
 * le montage, uniquement pour un bloc encore hors de l'écran et si le
 * visiteur n'a pas demandé à réduire les animations. Sans JavaScript, ou
 * pour le contenu visible au chargement, rien ne change.
 */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (el.getBoundingClientRect().top < window.innerHeight) return

    el.dataset.reveal = "pending"
    if (delay > 0) el.style.transitionDelay = `${delay}ms`
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = "shown"
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
