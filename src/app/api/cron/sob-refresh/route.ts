import { NextResponse, type NextRequest } from "next/server"
import { isAuthorizedCron } from "@/lib/security/cron"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { refreshSob } from "@/lib/sob/refresh"

export const dynamic = "force-dynamic"
export const maxDuration = 180

/**
 * POST /api/cron/sob-refresh[?version=<version publiée>]
 * Appelé par le pipeline après chaque exécution : invalide les caches State of
 * BIB, vérifie la version servie et lance les analyses IA. Authentifié par le
 * secret des tâches planifiées ; aucune session utilisateur n'est requise.
 *   200 : le site sert la version attendue ;
 *   409 : le site ne sert pas (encore) cette version — le workflow échoue ;
 *   503 : configuration serveur absente (jamais un faux succès).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req.headers)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 })
  const raw = req.nextUrl.searchParams.get("version")
  const expected = raw && /^[A-Za-z0-9._-]{1,64}$/.test(raw) ? raw : null
  const report = await refreshSob(expected)
  return NextResponse.json(report, { status: report.ok ? 200 : 409, headers: { "cache-control": "no-store" } })
}
