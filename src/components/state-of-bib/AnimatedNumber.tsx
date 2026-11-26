"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Chiffre qui se construit une fois à l'entrée dans l'écran (900 ms).
 * La valeur finale est toujours dans le DOM pour les lecteurs d'écran
 * (texte caché visuellement) ; la partie animée est aria-hidden, donc aucune
 * valeur intermédiaire n'est annoncée. Avec « réduire les animations » ou
 * sans IntersectionObserver, la valeur finale s'affiche directement.
 */
export function AnimatedNumber({ value, locale, className, style }: { value: number; locale: string; className?: string; style?: React.CSSProperties }) {
  const nf = new Intl.NumberFormat(locale)
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return
    let raf = 0
    const start = requestAnimationFrame(() => setShown(0))
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 900)
        const eased = 1 - Math.pow(1 - k, 3)
        setShown(k >= 1 ? null : Math.round(value * eased))
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { rootMargin: "0px 0px -15% 0px" })
    io.observe(el)
    return () => {
      cancelAnimationFrame(start)
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [value])

  return (
    <span ref={ref} className={className} style={style}>
      <span className="sr-only">{nf.format(value)}</span>
      <span aria-hidden="true" style={{ fontVariantNumeric: "tabular-nums" }}>{nf.format(shown ?? value)}</span>
    </span>
  )
}
