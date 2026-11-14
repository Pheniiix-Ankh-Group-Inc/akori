import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { env, isBrevoConfigured, isSupabaseAdminConfigured } from "@/lib/env"
import { BrevoError, requestDoubleOptIn } from "@/lib/brevo"
import { clientIp, consumeRateLimit, fingerprint, isPepperConfigured, isSameOrigin } from "@/lib/security/rate-limit"
import { getAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/newsletter — inscription à la newsletter BIB.
 * - désactivée tant que FEATURE_NEWSLETTER_SUBSCRIBE≠true, Brevo incomplet,
 *   NEWSLETTER_EMAIL_HASH_PEPPER absent (32 caractères minimum) ou Supabase
 *   serveur non configuré (preuve de consentement et limiteur partagé requis) ;
 * - preuve de la demande enregistrée AVANT l'appel Brevo (états pending →
 *   requested | request_failed) ; une demande acceptée < 24 h n'est pas répétée ;
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
  if (!env.flags.newsletterSubscribe || !isBrevoConfigured() || !isPepperConfigured() || !isSupabaseAdminConfigured()) {
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

  const [ipDecision, emailDecision] = await Promise.all([
    consumeRateLimit(`nl:ip:${fingerprint(clientIp(req.headers))}`, 5, 600),
    consumeRateLimit(`nl:email:${emailKey}`, 3, 86400),
  ])
  // Limiteur partagé indisponible : refus maîtrisé (fail closed).
  if (ipDecision === "unavailable" || emailDecision === "unavailable") return json({ ok: false, code: "unavailable" }, 503)
  if (ipDecision === "limited" || emailDecision === "limited") return json({ ok: false, code: "rate" }, 429)

  const admin = getAdminClient()

  // Demande déjà acceptée par Brevo dans les dernières 24 h : aucune nouvelle
  // sollicitation, même réponse (pas d'énumération des abonnés).
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: recent, error: recentError } = await admin
    .from("newsletter_consents")
    .select("id")
    .eq("email_sha256", emailKey)
    .eq("status", "requested")
    .gte("created_at", since)
    .limit(1)
  if (recentError) return json({ ok: false, code: "unavailable" }, 503)
  if (recent && recent.length > 0) return json({ ok: true, code: "doi_sent" })

  // 1. Trace AVANT l'appel Brevo : aucune demande sans preuve enregistrée.
  const { data: consent, error: consentError } = await admin
    .from("newsletter_consents")
    .insert({ email_sha256: emailKey, locale, consent_text_version: env.newsletter.consentTextVersion, status: "pending" })
    .select("id")
    .single()
  if (consentError || !consent) {
    console.error("[newsletter] preuve de consentement non enregistrée", consentError?.code)
    return json({ ok: false, code: "unavailable" }, 503)
  }
  const consentId = (consent as { id: string }).id

  // 2. Demande de double opt-in (la CONFIRMATION se fait chez Brevo).
  try {
    await requestDoubleOptIn(email, locale)
  } catch (e) {
    // Contact déjà confirmé : même réponse que pour une nouvelle inscription.
    if (!(e instanceof BrevoError && e.code === "duplicate_parameter")) {
      console.error("[newsletter] échec Brevo", e instanceof BrevoError ? e.status : "réseau")
      await admin.from("newsletter_consents").update({ status: "request_failed" }).eq("id", consentId)
      return json({ ok: false, code: "server" }, 502)
    }
  }

  // 3. État final. Un échec ici laisse la ligne « pending » : la demande a bien
  //    été envoyée (réponse exacte pour l'utilisateur), l'écart est tracé et
  //    réconciliable (docs/OPERATIONS_RUNBOOK.md).
  const { error: finalError } = await admin
    .from("newsletter_consents")
    .update({ status: "requested", brevo_requested_at: new Date().toISOString() })
    .eq("id", consentId)
  if (finalError) console.error("[newsletter] état de consentement à réconcilier", consentId, finalError.code)

  return json({ ok: true, code: "doi_sent" })
}
