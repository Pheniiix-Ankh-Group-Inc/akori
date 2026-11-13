import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { env, isBrevoConfigured, isSupabaseAdminConfigured } from "@/lib/env"
import { BrevoError, requestDoubleOptIn } from "@/lib/brevo"
import { clientIp, consumeRateLimit, fingerprint, isPepperConfigured, isSameOrigin } from "@/lib/security/rate-limit"
import { getAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/newsletter — inscription à la newsletter BIB.
 * - désactivée tant que FEATURE_NEWSLETTER_SUBSCRIBE≠true, Brevo incomplet ou
 *   NEWSLETTER_EMAIL_HASH_PEPPER absent (32 caractères minimum) ;
 * - même origine exigée (CSRF), champ piège anti-robot, limitation de débit
 *   par IP et par adresse ;
 * - consentement explicite obligatoire, langue FR ou EN ;
 * - double opt-in Brevo : aucun e-mail de bienvenue, aucune inscription sans
 *   clic de confirmation ;
 * - réponse identique que l'adresse soit connue ou non.
 */

const schema = z.object({
  email: z.email().max(254),
  locale: z.enum(["fr", "en"]),
  consent: z.literal(true),
  website: z.string().max(0).optional(), // champ piège, doit rester vide
})

const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store" } })

export async function POST(req: NextRequest) {
  // Fail closed : drapeau, Brevo et poivre secret sont tous exigés.
  if (!env.flags.newsletterSubscribe || !isBrevoConfigured() || !isPepperConfigured()) {
    return json({ ok: false, code: "disabled" }, 503)
  }
  if (!isSameOrigin(req.headers, req.url)) return json({ ok: false, code: "forbidden" }, 403)
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return json({ ok: false, code: "invalid" }, 415)

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return json({ ok: false, code: "invalid" }, 400)
  }
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    const consentMissing = parsed.error.issues.some((i) => i.path[0] === "consent")
    return json({ ok: false, code: consentMissing ? "consent" : "invalid" }, 400)
  }
  const { email, locale } = parsed.data
  const emailKey = fingerprint(email)

  const [ipOk, emailOk] = await Promise.all([
    consumeRateLimit(`nl:ip:${fingerprint(clientIp(req.headers))}`, 5, 600),
    consumeRateLimit(`nl:email:${emailKey}`, 3, 86400),
  ])
  if (!ipOk || !emailOk) return json({ ok: false, code: "rate" }, 429)

  try {
    await requestDoubleOptIn(email, locale)
  } catch (e) {
    // Contact déjà confirmé : même réponse que pour une nouvelle inscription.
    if (!(e instanceof BrevoError && e.code === "duplicate_parameter")) {
      console.error("[newsletter] échec Brevo", e instanceof BrevoError ? e.status : "réseau")
      return json({ ok: false, code: "server" }, 502)
    }
  }

  // Preuve minimale de la demande de consentement (pas d'adresse en clair).
  if (isSupabaseAdminConfigured()) {
    const { error } = await getAdminClient().from("newsletter_consents").insert({
      email_sha256: emailKey,
      locale,
      consent_text_version: env.newsletter.consentTextVersion,
    })
    if (error) console.error("[newsletter] preuve de consentement non enregistrée", error.code)
  }

  return json({ ok: true, code: "doi_sent" })
}
