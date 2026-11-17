/**
 * Destination après connexion : uniquement une route interne de
 * l'administration (jamais une URL externe ni un chemin arbitraire).
 */
export function safeAdminNext(next: string | null | undefined): string {
  return next && /^\/admin(\/[A-Za-z0-9/_-]*)?$/.test(next) ? next : "/admin"
}
