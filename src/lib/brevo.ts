import "server-only"
import { env, isBrevoConfigured } from "@/lib/env"

/**
 * Client Brevo, serveur uniquement. La clé API n'est jamais journalisée,
 * ni en entier ni en partie. Brevo reste la source de vérité des contacts,
 * des consentements (double opt-in) et des désabonnements.
 */

export class BrevoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
  }
}

async function brevoFetch<T>(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<T> {
  if (!env.brevo.apiKey) throw new BrevoError("Brevo non configuré", 0, "not_configured")
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${env.brevo.apiUrl}${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": env.brevo.apiKey,
        ...(init.headers ?? {}),
      },
    })
    if (res.status === 204) return undefined as T
    const text = await res.text()
    const body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    if (!res.ok) {
      throw new BrevoError(`Brevo ${path} → HTTP ${res.status}`, res.status, typeof body.code === "string" ? body.code : undefined)
    }
    return body as T
  } finally {
    clearTimeout(timer)
  }
}

export type NewsletterLocale = "fr" | "en"

export const listIdFor = (locale: NewsletterLocale) => (locale === "fr" ? env.brevo.listIdFr : env.brevo.listIdEn)

/**
 * Inscription en double opt-in : Brevo envoie l'e-mail de confirmation et
 * n'ajoute le contact à la liste qu'après clic. Un contact déjà inscrit
 * reçoit au plus un nouvel e-mail de confirmation (géré par Brevo).
 */
export async function requestDoubleOptIn(email: string, locale: NewsletterLocale): Promise<void> {
  const templateId = locale === "fr" ? env.brevo.doiTemplateIdFr : env.brevo.doiTemplateIdEn
  if (!isBrevoConfigured() || !templateId) throw new BrevoError("Brevo non configuré", 0, "not_configured")
  await brevoFetch("/contacts/doubleOptinConfirmation", {
    method: "POST",
    body: JSON.stringify({
      email,
      includeListIds: [listIdFor(locale)],
      templateId,
      redirectionUrl: `${env.siteUrl}/${locale === "fr" ? "fr/" : ""}?newsletter=confirmed`,
      attributes: { NEWSLETTER_LANG: locale.toUpperCase() },
    }),
  })
}

/** E-mail interne d'alerte (équipe uniquement). */
export async function sendInternalAlert(subject: string, text: string): Promise<void> {
  if (!env.alerts.to || !env.brevo.senderEmail) throw new BrevoError("Alerte non configurée", 0, "not_configured")
  await brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: { name: env.brevo.senderName, email: env.brevo.senderEmail },
      to: env.alerts.to.split(",").map((e) => ({ email: e.trim() })).filter((e) => e.email),
      subject: `[BIB ops] ${subject}`,
      textContent: text,
    }),
  })
}

export interface CampaignInput {
  name: string
  subject: string
  previewText?: string
  htmlContent: string
  listId: number
  tag: string
}

/** Crée une campagne (non envoyée). */
export async function createCampaign(input: CampaignInput): Promise<number> {
  if (!env.brevo.senderEmail) throw new BrevoError("Expéditeur non configuré", 0, "not_configured")
  const res = await brevoFetch<{ id: number }>("/emailCampaigns", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      subject: input.subject,
      previewText: input.previewText,
      sender: { name: env.brevo.senderName, email: env.brevo.senderEmail },
      htmlContent: input.htmlContent,
      recipients: { listIds: [input.listId] },
      tag: input.tag,
    }),
  })
  if (!res?.id) throw new BrevoError("Création de campagne sans identifiant", 0)
  return res.id
}

export async function sendCampaignNow(campaignId: number): Promise<void> {
  await brevoFetch(`/emailCampaigns/${campaignId}/sendNow`, { method: "POST" })
}

export async function getCampaignStatus(campaignId: number): Promise<string | null> {
  const res = await brevoFetch<{ status?: string }>(`/emailCampaigns/${campaignId}`)
  return res?.status ?? null
}

/** Recherche une campagne déjà créée pour ce tag (réconciliation idempotente). */
export async function findCampaignByName(name: string): Promise<{ id: number; status: string } | null> {
  const res = await brevoFetch<{ campaigns?: { id: number; name: string; status: string }[] }>(
    `/emailCampaigns?type=classic&limit=50&sort=desc`,
  )
  const found = res?.campaigns?.find((c) => c.name === name)
  return found ? { id: found.id, status: found.status } : null
}
