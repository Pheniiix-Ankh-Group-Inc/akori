"use client"
import { useEffect, useRef } from "react"

/**
 * Observe a container and toggle `.in` on itself when ~15% visible.
 * Used by sections that fade in on scroll.
 */
export function useBibRevealSelf<T extends Element>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("in") }),
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

type StaggerOptions = {
  childSelector: string
  from?: { opacity?: number; translateY?: number }
  threshold?: number
  step?: number
}

/**
 * Stagger-reveals children matching `childSelector` as they enter view.
 * Each child is lifted with a progressive delay proportional to its index.
 */
export function useBibStaggerReveal<T extends HTMLElement>(options: StaggerOptions) {
  const ref = useRef<T>(null)
  const { childSelector, from = { opacity: 0, translateY: 24 }, threshold = 0.15, step = 60 } = options
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const children = root.querySelectorAll<HTMLElement>(childSelector)
    children.forEach(c => {
      c.style.opacity = String(from.opacity ?? 0)
      c.style.transform = `translateY(${from.translateY ?? 24}px)`
    })
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const el = e.target as HTMLElement
        if (!e.isIntersecting || el.dataset.revealed) return
        el.dataset.revealed = "true"
        const i = Array.from(children).indexOf(el)
        setTimeout(() => {
          el.style.opacity = "1"
          el.style.transform = "translateY(0)"
        }, i * step)
      })
    }, { threshold })
    children.forEach(c => io.observe(c))
    return () => io.disconnect()
  }, [childSelector, from.opacity, from.translateY, threshold, step])
  return ref
}
