import type { Instrumentation } from "next"

/**
 * Observabilité serveur (OpenTelemetry via @vercel/otel), service « bib-web ».
 *
 * - Sur Vercel, les spans (routes Next.js, rendu, appels fetch vers Supabase,
 *   Luma, Brevo, IA…) sont collectés par le traçage Vercel (Observability →
 *   Traces) ; aucun exporteur externe n'est configuré ici.
 * - En local et en test, sans collecteur, l'enregistrement est sans effet.
 * - Désactivable avec OTEL_SDK_DISABLED=true (convention OpenTelemetry).
 *
 * Voir docs/MONITORING.md.
 */
export async function register() {
  if (process.env.OTEL_SDK_DISABLED === "true") return
  const { registerOTel } = await import("@vercel/otel")
  registerOTel({ serviceName: "bib-web" })
}

/**
 * Erreurs serveur capturées par Next.js (rendu, routes, actions) : une ligne
 * de log structurée et assainie, corrélable avec les traces. Jamais le message
 * brut d'une erreur de rendu (il peut contenir des données), seulement son
 * type, son empreinte (digest) et la route.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { logEvent } = await import("@/lib/ops/log")
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null
  logEvent("error", "server.request_error", {
    errorName: err instanceof Error ? err.name : "UnknownError",
    digest,
    method: request.method,
    path: request.path.split("?")[0],
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: "renderSource" in context ? context.renderSource : null,
  })
}
