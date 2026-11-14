import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

export type AuditEntity = "event" | "story" | "media" | "testimonial" | "editor" | "sob_insight" | "newsletter"

/**
 * Journal d'audit minimal : auteur, date, objet, action. Ne jamais y placer
 * de secret ni de donnée personnelle superflue (pas d'adresse e-mail).
 * Un échec d'écriture du journal ne doit pas masquer l'action déjà faite :
 * il est signalé dans les logs serveur sans contenu sensible.
 */
export async function logAudit(
  supabase: SupabaseClient,
  actorId: string,
  action: string,
  entityType: AuditEntity,
  entityId: string | null,
  details: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  const { error } = await supabase.from("editorial_audit").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  })
  if (error) console.error(`[audit] échec d'écriture (${action})`, error.code)
}
