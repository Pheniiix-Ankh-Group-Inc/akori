"use client"
import { useEffect, useRef, useState } from "react"

/**
 * Monte un graphique lourd seulement à l'approche de la zone visible
 * (IntersectionObserver). Sans support, le contenu est monté immédiatement.
 */
export function LazyMount({ children, minHeight }: { children: React.ReactNode; minHeight: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- repli sans IntersectionObserver
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: "300px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={visible ? undefined : { minHeight }} aria-busy={!visible}>
      {visible ? children : null}
    </div>
  )
}
