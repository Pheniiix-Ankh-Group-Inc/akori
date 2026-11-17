"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth/editor"
import { isSupabaseAdminConfigured } from "@/lib/env"
import { logAudit } from "@/lib/audit"
import { createClient } from "@/lib/supabase/server"
import { addSource, probeFeed, REGION_TAGS, setSourceEnabled, sourceSchema } from "@/lib/news/sources"
import { ingestNews } from "@/lib/news/ingest"
import { recordIncident } from "@/lib/ops/incidents"

const BASE = "/admin/newsletter/sources"
const fail = (msg: string): never => redirect(`${BASE}?error=${encodeURIComponent(msg.slice(0, 300))}`)

function ensure() {
  if (!isSupabaseAdminConfigured()) fail("Clé de service Supabase non configurée.")
}

/** Ajout d'une source : le flux est lu et contrôlé avant tout enregistrement. */
export async function addSourceAction(fd: FormData) {
  const admin = await requireAdmin()
  ensure()
  if (fd.get("terms_checked") !== "on") fail("Confirmez avoir vérifié les conditions de réutilisation de la source.")
  const parsed = sourceSchema.safeParse({
    name: fd.get("name"),
    feed_url: fd.get("feed_url"),
    homepage_url: fd.get("homepage_url") ?? "",
    kind: fd.get("kind"),
    language: fd.get("language"),
    region_tags: REGION_TAGS.filter((r) => fd.get(`region_${r}`) === "on"),
    usage_terms: fd.get("usage_terms"),
  })
  if (!parsed.success) fail(parsed.error.issues.map((i) => i.message).slice(0, 3).join(" "))
  const input = parsed.data!
  const probe = await probeFeed(input.feed_url)
  if (!probe.ok) fail(probe.error ?? "Flux non vérifié.")
  let id = ""
  try {
    id = await addSource(input, probe)
  } catch (e) {
    fail((e as Error).message)
  }
  await logAudit(await createClient(), admin.id, "newsletter.source_add", "newsletter", id, { name: input.name, items: probe.items })
  redirect(`${BASE}?saved=1`)
}

export async function toggleSourceAction(fd: FormData) {
  const admin = await requireAdmin()
  ensure()
  const id = String(fd.get("id") ?? "")
  if (!z.uuid().safeParse(id).success) fail("Source invalide.")
  const enable = fd.get("enable") === "1"
  try {
    await setSourceEnabled(id, enable, admin.email ?? admin.id)
  } catch (e) {
    fail((e as Error).message)
  }
  await logAudit(await createClient(), admin.id, enable ? "newsletter.source_enable" : "newsletter.source_disable", "newsletter", id)
  redirect(`${BASE}?saved=1`)
}

/** Collecte immédiate des sources activées (admin), indépendante de la planification. */
export async function collectNowAction() {
  const admin = await requireAdmin()
  ensure()
  let summary = ""
  try {
    const r = await ingestNews()
    summary = `${r.sources} source(s), ${r.inserted} nouvel(s) article(s), ${r.failures.length} échec(s)`
    if (r.failures.length) await recordIncident({ kind: "news.fetch_failures", severity: "warning", message: `${r.failures.length} source(s) en échec`, details: { failures: r.failures } })
    await logAudit(await createClient(), admin.id, "newsletter.collect_now", "newsletter", null, { sources: r.sources, inserted: r.inserted, failures: r.failures.length })
  } catch (e) {
    fail(`Collecte impossible : ${(e as Error).message.slice(0, 160)}`)
  }
  redirect(`${BASE}?collected=${encodeURIComponent(summary)}`)
}
