import "server-only"
import { env } from "@/lib/env"
import { getAdminClient } from "@/lib/supabase/admin"
import { sendInternalAlert } from "@/lib/brevo"
import { logEvent, redact } from "./log"

export type Severity = "info" | "warning" | "critical"

/**
 * Journalise un incident et, si FEATURE_OPS_ALERTS=true et que l'adresse
 * d'alerte est configurée, prévient l'équipe PAR E-MAIL UNIQUEMENT.
 * Aucun détail sensible (adresse, clé, contenu de contact) n'est envoyé.
 */
export async function recordIncident(input: {
  kind: string
  severity: Severity
  message: string
  cycleId?: string | null
  details?: Record<string, unknown>
}): Promise<void> {
  const admin = getAdminClient()
  const details = redact(input.details ?? {}) as Record<string, unknown>
  const message = String(redact(input.message))
  const { data, error } = await admin
    .from("ops_incidents")
    .insert({ kind: input.kind, severity: input.severity, cycle_id: input.cycleId ?? null, message, details })
    .select("id")
    .single()
  const id = (data as { id: string } | null)?.id
  // Trace serveur systématique : l'incident reste visible même si la base
  // est indisponible.
  logEvent(input.severity === "critical" ? "error" : input.severity === "warning" ? "warn" : "info", "ops.incident", {
    kind: input.kind,
    cycleId: input.cycleId ?? null,
    incidentId: id ?? null,
    stored: !error,
  })

  if (!env.flags.opsAlerts || !env.alerts.to || input.severity === "info") return
  try {
    await sendInternalAlert(`${input.severity.toUpperCase()} · ${input.kind}`, `${message}\n\nIncident : ${id ?? "non enregistré"}\nDétails : ${JSON.stringify(details).slice(0, 2000)}`)
    if (id) await admin.from("ops_incidents").update({ notified_at: new Date().toISOString() }).eq("id", id)
  } catch (e) {
    console.error("[ops] alerte e-mail non envoyée", (e as Error).message)
  }
}
