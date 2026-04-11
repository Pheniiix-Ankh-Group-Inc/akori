"use client"
import { useEffect, useRef, useState } from "react"

interface Options extends IntersectionObserverInit {
  once?: boolean
}

export function useIntersectionObserver<T extends Element>(
  options: Options = {}
) {
  const { threshold = 0.07, rootMargin = "0px 0px -35px 0px", once = true, ...rest } = options
  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) io.unobserve(el)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin, ...rest }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, rootMargin, once]) // eslint-disable-line

  return { ref, isVisible }
}