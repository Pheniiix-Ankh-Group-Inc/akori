"use client"

import { useEffect } from "react"

/**
 * useParallax
 * Applique l'effet parallax sur :
 *   - [data-parallax] → vitesse 0.35 (sections storytelling)
 *   - [data-parallax-slow] → vitesse 0.18 (sections plein écran)
 * Identique au script JS du HTML v3.
 */
export function useParallax() {
  useEffect(() => {
    type ParallaxItem = {
      el: HTMLElement
      wrap: HTMLElement
      speed: number
    }

    const items: ParallaxItem[] = []

    document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((wrap) => {
      const inner = wrap.querySelector<HTMLElement>(".story-photo-inner")
      if (inner) items.push({ el: inner, wrap, speed: 0.35 })
    })

    document.querySelectorAll<HTMLElement>("[data-parallax-slow]").forEach((el) => {
      const wrap = el.parentElement as HTMLElement
      items.push({ el, wrap, speed: 0.18 })
    })

    const onScroll = () => {
      items.forEach(({ el, wrap, speed }) => {
        const rect   = wrap.getBoundingClientRect()
        const center = rect.top + rect.height / 2 - window.innerHeight / 2
        el.style.transform = `translateY(${center * speed}px)`
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener("scroll", onScroll)
  }, [])
}