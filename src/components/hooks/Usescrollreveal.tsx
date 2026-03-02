"use client"

import { useEffect } from "react"

/**
 * useScrollReveal
 * Active la classe .visible sur les éléments [data-reveal]
 * quand ils entrent dans le viewport.
 * Identique au script JS du HTML v3.
 */
export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: "0px 0px -50px 0px" }
    )

    const elements = document.querySelectorAll("[data-reveal]")
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])
}