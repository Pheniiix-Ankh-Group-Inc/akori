import "server-only"
import { track } from "@vercel/analytics/server"
import { isAnalyticsEvent, sanitizeProps, type AnalyticsEvent } from "@/lib/analytics"

/**
 * Événement métier côté serveur (ex. connexion), mêmes règles que le client :
 * liste fermée, 2 propriétés au plus, aucune donnée personnelle. Ne bloque
 * jamais le parcours : 800 ms au plus, erreurs ignorées.
 */
export async function trackServerEvent(name: AnalyticsEvent, props: Record<string, unknown>, headers: Headers): Promise<void> {
  if (!isAnalyticsEvent(name)) return
  try {
    await Promise.race([
      track(name, sanitizeProps(props), { headers }),
      new Promise<void>((resolve) => setTimeout(resolve, 800)),
    ])
  } catch {
    /* l'analytics ne doit jamais casser une connexion */
  }
}
