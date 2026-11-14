/**
 * En-têtes de sécurité HTTP. Module pur (sans dépendance Next.js) afin d'être
 * utilisé par next.config.ts et vérifié par les tests et la CI.
 *
 * Origines autorisées : uniquement celles réellement utilisées.
 * - Supabase (Auth, PostgREST, Storage, URL signées) : origine dérivée de
 *   NEXT_PUBLIC_SUPABASE_URL ; jamais de joker *.supabase.co.
 * - Luma : cadre d'inscription éventuel (lu.ma / luma.com).
 * - Polices : servies localement par next/font ; Vercel Analytics : même origine.
 *
 * Limite connue : script-src conserve 'unsafe-inline', exigé par les scripts
 * en ligne du App Router tant qu'aucune CSP à nonce n'est mise en place (elle
 * imposerait un rendu dynamique de toutes les pages). Voir docs/SECURITY.md.
 */

export type HeaderOptions = { supabaseUrl?: string | null; isDev?: boolean }

/** Origine https d'une URL Supabase valide, sinon null (aucune ouverture). */
export function supabaseOrigin(url?: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== "https:" && !(u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname))) return null
    return u.origin
  } catch {
    return null
  }
}

const LUMA_FRAMES = ["https://lu.ma", "https://*.lu.ma", "https://luma.com", "https://*.luma.com"]

export function buildCsp({ supabaseUrl, isDev = false }: HeaderOptions): string {
  const sb = supabaseOrigin(supabaseUrl)
  const list = (...v: (string | null | false)[]) => v.filter(Boolean).join(" ")

  const directives: Record<string, string> = {
    "default-src": "'self'",
    "script-src": list("'self'", "'unsafe-inline'", isDev && "'unsafe-eval'"),
    "style-src": "'self' 'unsafe-inline'",
    "img-src": list("'self'", "data:", "blob:", sb),
    "media-src": list("'self'", "blob:", sb),
    "font-src": "'self' data:",
    "connect-src": list("'self'", sb, isDev && "ws:"),
    "frame-src": list("'self'", ...LUMA_FRAMES),
    "worker-src": "'self' blob:",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'self'",
    "manifest-src": "'self'",
  }
  const csp = Object.entries(directives).map(([k, v]) => `${k} ${v}`)
  if (!isDev) csp.push("upgrade-insecure-requests")
  return csp.join("; ")
}

export function securityHeaders(opts: HeaderOptions): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: buildCsp(opts) },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // HSTS sans « preload » : l'inscription à la liste de préchargement est
    // quasi irréversible et engage tous les sous-domaines ; décision à prendre
    // explicitement par le propriétaire du domaine (docs/SECURITY.md).
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ]
}
