import "server-only"
import { timingSafeEqual } from "node:crypto"
import { env } from "@/lib/env"

/**
 * Authentifie un déclencheur planifié (GitHub Actions ou planificateur
 * compatible) : en-tête Authorization: Bearer <CRON_SECRET>.
 * Sans CRON_SECRET configuré, tous les déclenchements sont refusés.
 */
export function isAuthorizedCron(headers: Headers): boolean {
  const secret = env.cron.secret
  if (!secret || secret.length < 32) return false
  const header = headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}
