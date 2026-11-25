"use client"

import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { useEffect } from "react"
import { outboundHost, scrubUrl, trackEvent } from "@/lib/analytics"

/**
 * Mesure d'audience (Vercel Web Analytics) et de performance (Speed Insights)
 * avec URL assainies : ni paramètres (jetons, codes), ni fragment.
 * Ajoute deux mesures transverses :
 * - outbound_click : clic sur un lien externe (nom d'hôte seulement) ;
 * - newsletter_signup_success : retour du lien de confirmation du double
 *   opt-in (?newsletter=confirmed), une fois par session de navigation.
 */
export function SiteAnalytics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!a) return
      const host = outboundHost(a.getAttribute("href") ?? "", window.location.origin)
      if (host) trackEvent("outbound_click", { host }, { key: `outbound:${host}`, throttleMs: 1000 })
    }
    document.addEventListener("click", onClick, { capture: true })

    if (new URLSearchParams(window.location.search).get("newsletter") === "confirmed") {
      let already = false
      try {
        already = window.sessionStorage.getItem("bib_nl_confirmed") === "1"
        window.sessionStorage.setItem("bib_nl_confirmed", "1")
      } catch {
        /* stockage indisponible : le dédoublonnage en mémoire suffit */
      }
      if (!already) trackEvent("newsletter_signup_success", { locale: document.documentElement.lang || null }, { once: "newsletter_signup_success" })
    }
    return () => document.removeEventListener("click", onClick, { capture: true })
  }, [])

  return (
    <>
      <Analytics beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })} />
      <SpeedInsights beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })} />
    </>
  )
}
