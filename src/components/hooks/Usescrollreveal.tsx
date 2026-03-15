"use client"

import { useEffect } from "react"

export function useScrollReveal() {

  useEffect(() => {
    // Reset tous les éléments d'abord
    const elements = document.querySelectorAll("[data-reveal]:not(.visible)")

    if (!elements.length) return

    

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.05, rootMargin: "0px 0px -50px 0px" }
    )

   elements.forEach((el) => {

      const rect = el.getBoundingClientRect()

      const inViewport =
        rect.top < window.innerHeight &&
        rect.bottom > 0

      if (inViewport) {
        el.classList.add("visible")
      } else {
        observer.observe(el)
      }

    })

    return () => observer.disconnect()

  }, [])

}