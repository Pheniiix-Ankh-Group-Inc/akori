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
    let animationId: number
    
    const onScroll = () => {
      cancelAnimationFrame(animationId)
      animationId = requestAnimationFrame(() => {
        items.forEach(({ el, wrap, speed }) => {
          const rect = wrap.getBoundingClientRect()
          
          
          if (window.innerWidth < 768) {
            el.style.transform = "translateY(0px)"
            return
          }
          
          const center = rect.top + rect.height / 2 - window.innerHeight / 2
          el.style.transform = `translateY(${center * speed}px)`
        })
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])
}