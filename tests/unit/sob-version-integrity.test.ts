import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { isVerifiedVersion, versionIntegrityIssues } from "@/lib/sob/version-integrity"

const ok = { status: "superseded", published_at: "2026-11-18T05:47:39Z", decided_at: "2026-11-18T05:47:39Z", pipeline_version: "2026.11.3", source_fingerprint: "abc" }

describe("State of BIB — intégrité des versions historiques", () => {
  it("une version passée par le circuit complet est vérifiée", () => {
    expect(isVerifiedVersion(ok)).toBe(true)
    expect(isVerifiedVersion({ ...ok, status: "published" })).toBe(true)
  })
  it("20260419T130333 (reprise d'historique) n'est pas présentée comme vérifiée", () => {
    // État observé sur akori le 2026-11-26.
    const april = { status: "superseded", published_at: null, decided_at: null, pipeline_version: null, source_fingerprint: null }
    expect(isVerifiedVersion(april)).toBe(false)
    expect(versionIntegrityIssues(april)).toEqual(["never_published", "no_decision", "no_pipeline", "no_fingerprint"])
  })
  it("candidate ou rejetée : jamais vérifiée", () => {
    for (const status of ["candidate", "rejected", "quarantined"]) expect(isVerifiedVersion({ ...ok, status })).toBe(false)
  })
  it("chaque consommateur public filtre les versions non vérifiées", () => {
    const history = readFileSync("src/lib/sob/history.ts", "utf8")
    expect(history).toMatch(/\.filter\(isVerifiedVersion\)/)
    expect(history).toMatch(/historical version not verified/)
    const load = readFileSync("src/lib/sob/load.ts", "utf8")
    for (const col of ["published_at", "decided_at", "pipeline_version", "source_fingerprint"]) {
      expect(load).toContain(`.not("dataset_versions.${col}", "is", null)`)
    }
  })
})

describe("State of BIB — frise des versions", () => {
  const page = readFileSync("src/app/[locale]/(public)/state_of_bib/page.tsx", "utf8")
  const timeline = page.slice(page.indexOf('className="sob-versions"'), page.indexOf("</ol>", page.indexOf('className="sob-versions"')))
  it("utilise is_current de Supabase, pas la position dans la liste", () => {
    expect(timeline).toContain("v.is_current")
    expect(timeline).not.toMatch(/arr\.length - 1|isLatest/)
  })
  it("liens localisés : Link de @/i18n/navigation, aucun <a href> brut", () => {
    expect(page).toMatch(/import \{ Link \} from "@\/i18n\/navigation"/)
    expect(timeline).toContain("<Link href={href}>")
    expect(timeline).not.toMatch(/<a\s+href=/)
  })
})
