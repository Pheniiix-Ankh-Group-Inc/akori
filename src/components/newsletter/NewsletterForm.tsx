"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

type Status = "idle" | "sending" | "ok" | "disabled" | "invalid" | "consent" | "rate" | "server"

/**
 * Formulaire d'inscription. La langue de la newsletter (FR ou EN) est
 * choisie explicitement, indépendamment de la langue du site (FR/EN/ES).
 */
export function NewsletterForm() {
  const t = useTranslations("Newsletter")
  const siteLocale = useLocale()
  const [status, setStatus] = useState<Status>("idle")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    if (form.get("consent") !== "on") return setStatus("consent")
    setStatus("sending")
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          locale: form.get("locale") === "en" ? "en" : "fr",
          consent: true,
          website: String(form.get("website") ?? ""),
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { code?: string }
      if (res.ok) return setStatus("ok")
      const code = body.code
      setStatus(code === "disabled" ? "disabled" : code === "invalid" ? "invalid" : code === "consent" ? "consent" : code === "rate" ? "rate" : "server")
    } catch {
      setStatus("server")
    }
  }

  const message: Partial<Record<Status, string>> = {
    ok: t("successDoi"),
    disabled: t("successDisabled"),
    invalid: t("errorInvalid"),
    consent: t("errorConsent"),
    rate: t("errorRate"),
    server: t("errorServer"),
  }

  return (
    <form onSubmit={onSubmit} noValidate className="ed-form">
      <div className="ed-field">
        <label htmlFor="nl-email">{t("emailLabel")}</label>
        <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="nom@exemple.com" className="ed-input" />
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="ed-legend" style={{ marginBottom: "0.25rem" }}>{t("languageLabel")}</legend>
        <div className="ed-row" style={{ gap: "1.5rem" }}>
          <label className="ed-radio">
            <input type="radio" name="locale" value="fr" defaultChecked={siteLocale !== "en"} /> {t("langFr")}
          </label>
          <label className="ed-radio">
            <input type="radio" name="locale" value="en" defaultChecked={siteLocale === "en"} /> {t("langEn")}
          </label>
        </div>
      </fieldset>
      <label className="ed-check">
        <input type="checkbox" name="consent" required />
        <span>{t("consentLabel")}</span>
      </label>
      {/* Champ piège : invisible pour les personnes, rempli par les robots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="nl-website">Website</label>
        <input id="nl-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" className="ed-btn ed-btn-dark" disabled={status === "sending"}>
        {status === "sending" ? t("submitting") : t("submit")}
      </button>
      {message[status] && (
        <p role={status === "ok" || status === "disabled" ? "status" : "alert"} className={status === "ok" || status === "disabled" ? "ed-status-ok" : "ed-status-err"} style={{ margin: 0 }}>
          {message[status]}
        </p>
      )}
      <p className="ed-muted" style={{ margin: 0, fontSize: "0.8rem" }}>
        {t("privacyNote")} <Link href="/privacy" className="ed-link" style={{ minHeight: 0, display: "inline" }}>→</Link>
      </p>
    </form>
  )
}
