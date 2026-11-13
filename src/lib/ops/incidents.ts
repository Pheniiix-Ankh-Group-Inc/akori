import "server-only"
import { env } from "@/lib/env"
import { getAdminClient } from "@/lib/supabase/admin"
import { sendInternalAlert } from "@/lib/brevo"

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
  const { data } = await admin
    .from("ops_incidents")
    .insert({ kind: input.kind, severity: input.severity, cycle_id: input.cycleId ?? null, message: input.message, details: input.details ?? {} })
    .select("id")
    .single()
  const id = (data as { id: string } | null)?.id

  if (!env.flags.opsAlerts || !env.alerts.to || input.severity === "info") return
  try {
    await sendInternalAlert(`${input.severity.toUpperCase()} · ${input.kind}`, `${input.message}\n\nIncident : ${id ?? "non enregistré"}\nDétails : ${JSON.stringify(input.details ?? {}).slice(0, 2000)}`)
    if (id) await admin.from("ops_incidents").update({ notified_at: new Date().toISOString() }).eq("id", id)
  } catch (e) {
    console.error("[ops] alerte e-mail non envoyée", (e as Error).message)
  }
}
