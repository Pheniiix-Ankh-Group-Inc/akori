"use client"

import { useEffect, useRef } from "react"
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics"

/**
 * Émet un événement de consultation une seule fois par page affichée.
 * readComplete : émet aussi article_read_complete quand la fin de l'article
 * devient visible après au moins 15 secondes sur la page (règle documentée
 * dans docs/MONITORING.md : lecture jusqu'au bout, pas un simple défilement).
 */
export function TrackView({ event, props, readComplete = false }: { event: AnalyticsEvent; props?: Record<string, string | number | null>; readComplete?: boolean }) {
  const endRef = useRef<HTMLSpanElement>(null)
  const serialized = JSON.stringify(props ?? {})

  useEffect(() => {
    const p = JSON.parse(serialized) as Record<string, string | number | null>
    const path = window.location.pathname
    trackEvent(event, p, { once: `${event}:${path}` })
    if (!readComplete || !endRef.current || typeof IntersectionObserver === "undefined") return
    const openedAt = Date.now()
    let timer: ReturnType<typeof setTimeout> | undefined
    const complete = () => {
      trackEvent("article_read_complete", p, { once: `article_read_complete:${path}` })
      observer.disconnect()
    }
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting)
      if (timer) clearTimeout(timer)
      if (!visible) return
      const remaining = 15_000 - (Date.now() - openedAt)
      if (remaining <= 0) complete()
      else timer = setTimeout(complete, remaining)
    })
    observer.observe(endRef.current)
    return () => {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    }
  }, [event, serialized, readComplete])

  return readComplete ? <span ref={endRef} aria-hidden="true" style={{ display: "block", height: 1 }} /> : null
}
