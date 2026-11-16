import "server-only"
import { env, isGithubDispatchConfigured } from "@/lib/env"

/** Workflows que l'administration peut relancer (liste fermée). */
export const DISPATCHABLE = {
  "refresh-data.yml": "State of BIB — vérification et traitement",
  "events-sync.yml": "Événements — synchronisation Luma",
  "news-ingest.yml": "Actualités — collecte",
} as const
export type DispatchableWorkflow = keyof typeof DISPATCHABLE

/**
 * Déclenche un workflow GitHub Actions (workflow_dispatch). Le jeton reste
 * côté serveur ; seuls les workflows de la liste fermée sont acceptés et les
 * entrées sont des chaînes simples. Renvoie une erreur lisible sans secret.
 */
export async function dispatchWorkflow(
  workflow: DispatchableWorkflow,
  inputs: Record<string, string> = {},
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(workflow in DISPATCHABLE)) return { ok: false, error: "Workflow non autorisé." }
  if (!isGithubDispatchConfigured()) return { ok: false, error: "Déclenchement GitHub non configuré (GITHUB_DISPATCH_TOKEN)." }
  try {
    const res = await fetchFn(`https://api.github.com/repos/${env.github.repository}/actions/workflows/${workflow}/dispatches`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.github.dispatchToken}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ref: env.github.ref, inputs }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    })
    if (res.status === 204) return { ok: true }
    return { ok: false, error: `GitHub a refusé le déclenchement (HTTP ${res.status}).` }
  } catch (e) {
    return { ok: false, error: `GitHub injoignable (${(e as Error).name}).` }
  }
}
