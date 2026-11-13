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
    <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 520 }}>
      <div className="auth-field">
        <label className="auth-label" htmlFor="nl-email">{t("emailLabel")}</label>
        <input id="nl-email" name="email" type="email" required autoComplete="email" className="auth-input" />
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="auth-label" style={{ marginBottom: "0.5rem" }}>{t("languageLabel")}</legend>
        <label style={{ marginRight: "1.5rem" }}>
          <input type="radio" name="locale" value="fr" defaultChecked={siteLocale !== "en"} /> {t("langFr")}
        </label>
        <label>
          <input type="radio" name="locale" value="en" defaultChecked={siteLocale === "en"} /> {t("langEn")}
        </label>
      </fieldset>
      <label className="text-sm" style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
        <input type="checkbox" name="consent" required style={{ marginTop: "0.25rem" }} />
        <span>{t("consentLabel")}</span>
      </label>
      {/* Champ piège : invisible pour les personnes, rempli par les robots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="nl-website">Website</label>
        <input id="nl-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" className="auth-social-btn" disabled={status === "sending"} style={{ alignSelf: "flex-start" }}>
        {status === "sending" ? t("submitting") : t("submit")}
      </button>
      {message[status] && (
        <p role={status === "ok" || status === "disabled" ? "status" : "alert"} className="text-sm" style={{ margin: 0 }}>
          {message[status]}
        </p>
      )}
      <p className="text-xs" style={{ margin: 0 }}>
        {t("privacyNote")} <Link href="/privacy">→</Link>
      </p>
    </form>
  )
}
