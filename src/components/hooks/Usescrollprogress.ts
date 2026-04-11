"use client"
import { useState, useEffect } from "react"

export function useScrollProgress() {
  const [progress, setProgress] = useState(0)
  const [scrolled, setScrolled]  = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0)
      setScrolled(window.scrollY > 8)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return { progress, scrolled }
}