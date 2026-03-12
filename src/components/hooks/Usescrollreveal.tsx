"use client"

import { useEffect } from "react"

export function useScrollReveal() {

  useEffect(() => {
    // Reset tous les éléments d'abord
    const elements = document.querySelectorAll("[data-reveal]")
    elements.forEach((el) => el.classList.remove("visible"))

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

    // Petit délai pour laisser le DOM se mettre à jour
    const timeout = setTimeout(() => {
      const freshElements = document.querySelectorAll("[data-reveal]")
      freshElements.forEach((el) => observer.observe(el))
    }, 100)

    return () => {
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [])
}