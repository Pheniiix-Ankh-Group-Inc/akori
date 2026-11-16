import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"
import { fallbackProblems, snapshotProblems, type SobFiles } from "@/lib/sob/validity"
import { mentionsSobProvider } from "@/lib/sob/public-text"
import { buildSobFixture } from "../helpers/sob-fixture.mjs"

const ROOT = path.resolve(__dirname, "../..")
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8")
const json = (p: string) => JSON.parse(read(p))

function repoCopy(): SobFiles {
  const d = "data/state-of-bib/current"
  return {
    meta: json(`${d}/meta.json`), headline: json(`${d}/headline.json`), countryMap: json(`${d}/country_map.json`),
    topCities: json(`${d}/top_cities.json`), ecoMix: json(`${d}/ecosystem_mix.json`), cohort: json(`${d}/tenure_cohort.json`),
  }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

describe("State of BIB — validité des données affichées", () => {
  it("un lot cohérent, daté et de provenance connue est accepté", async () => {
    const f = (await buildSobFixture()) as SobFiles
    expect(snapshotProblems(f)).toEqual([])
    expect(fallbackProblems(f)).toEqual([])
  })

  it("la copie d'avril 2026 du dépôt est refusée comme repli (incohérente, sans provenance, périmée)", () => {
    const problems = fallbackProblems(repoCopy(), new Date("2026-11-15T00:00:00Z")).join(" | ")
    expect(problems).toMatch(/headline\.countries/)
    expect(problems).toMatch(/somme par pays/)
    expect(problems).toMatch(/provenance absente/)
    expect(problems).toMatch(/périmée/)
  })

  it("une copie cohérente mais trop ancienne est refusée", async () => {
    const f = (await buildSobFixture({ snapshotDate: "2026-01-10" })) as SobFiles
    expect(snapshotProblems(f)).toEqual([])
    expect(fallbackProblems(f, new Date("2026-11-15T00:00:00Z")).join()).toMatch(/périmée/)
    expect(fallbackProblems(f, new Date("2026-03-01T00:00:00Z"))).toEqual([])
  })

  it("totaux incohérents, série tronquée, ville hors périmètre : détectés", async () => {
    const f = (await buildSobFixture()) as SobFiles
    expect(snapshotProblems({ ...f, headline: { ...f.headline, devs_active_28d: f.headline.devs_active_28d + 1 } }).join()).toMatch(/somme par pays/)
    expect(snapshotProblems({ ...f, cohort: { ...f.cohort, devs_0_1y: f.cohort.devs_0_1y.slice(1) } }).join()).toMatch(/longueur incohérente/)
    expect(snapshotProblems({ ...f, topCities: [{ ...f.topCities[0], iso_a3: "ZZZ" }] }).join()).toMatch(/pays absent/)
    expect(snapshotProblems({ ...f, countryMap: [] }).join()).toMatch(/aucun pays/)
  })
})

describe("State of BIB — aucun téléchargement public", () => {
  it("la route d'export et son module n'existent plus", () => {
    expect(existsSync(path.join(ROOT, "src/app/api/state-of-bib"))).toBe(false)
    expect(existsSync(path.join(ROOT, "src/lib/sob/export.ts"))).toBe(false)
  })

  it("aucune route API ne sert State of BIB hors tâches planifiées authentifiées", () => {
    const routes = walk(path.join(ROOT, "src/app/api")).filter((p) => p.endsWith("route.ts"))
    const sob = routes.filter((p) => /sob|state-of-bib/i.test(p) || /loadSobState|dataset_artifacts|metric_observations/.test(readFileSync(p, "utf8")))
    for (const p of sob) {
      expect(p.replace(ROOT, "")).toMatch(/\/api\/cron\//)
      expect(readFileSync(p, "utf8")).toMatch(/isAuthorizedCron/)
    }
  })

  it("aucun JSON State of BIB n'est servi depuis public/", () => {
    const pub = walk(path.join(ROOT, "public")).map((p) => p.replace(ROOT, ""))
    for (const n of ["meta.json", "headline.json", "country_map.json", "top_cities.json", "ecosystem_mix.json", "tenure_cohort.json"]) {
      expect(pub.some((p) => p.endsWith(`/${n}`))).toBe(false)
    }
    expect(pub.some((p) => p.includes("data-history"))).toBe(false)
    expect(existsSync(path.join(ROOT, "data/state-of-bib/current/meta.json"))).toBe(true)
  })

  it("la page publique ne contient ni lien d'export ni attribut de téléchargement", () => {
    const page = read("src/app/[locale]/(public)/state_of_bib/page.tsx")
    expect(page).not.toMatch(/export\?|format=csv|format=json|\bdownload\b|\.csv/i)
    expect(page).not.toMatch(/meta\.source|source\.license/)
    expect(page).toMatch(/\/data-sources/)
  })

  it("le code n'utilise plus d'URL de bucket public pour les données", () => {
    for (const p of walk(path.join(ROOT, "src")).filter((f) => /\.(ts|tsx)$/.test(f))) {
      expect(readFileSync(p, "utf8"), p).not.toMatch(/object\/public\/bib-sob|publicSnapshotUrl/)
    }
  })

  it("les traductions ne proposent plus de téléchargement State of BIB", () => {
    for (const l of ["fr", "en", "es"]) {
      const sob = JSON.stringify(json(`src/messages/${l}.json`).Site.sob)
      expect(sob).not.toMatch(/CSV|JSON|export|télécharg|download|descarg/i)
    }
  })
})

describe("State of BIB — sources uniquement dans la page légale", () => {
  const scan = (o: unknown, trail: string, hits: string[]) => {
    if (typeof o === "string") {
      if (mentionsSobProvider(o)) hits.push(trail)
    } else if (o && typeof o === "object") {
      for (const [k, v] of Object.entries(o)) scan(v, `${trail}.${k}`, hits)
    }
  }

  it.each(["fr", "en", "es"])("%s : aucune mention de fournisseur ou de licence hors namespace légal", (l) => {
    const { DataSources, ...rest } = json(`src/messages/${l}.json`)
    const hits: string[] = []
    scan(rest, "", hits)
    expect(hits).toEqual([])
    const legal = JSON.stringify(DataSources)
    expect(legal).toMatch(/Electric Capital/)
    expect(legal).toMatch(/CC BY 4\.0/)
    expect(legal).toMatch(/Open Dev Data/)
    expect(legal).toMatch(/Natural Earth/)
  })

  it("les pages et composants publics ne nomment pas les fournisseurs (hors page légale)", () => {
    const files = [...walk(path.join(ROOT, "src/app/[locale]")), ...walk(path.join(ROOT, "src/components"))]
      .filter((f) => /\.tsx?$/.test(f) && !f.includes("/data-sources/") && !f.includes("/components/admin/"))
    for (const f of files) {
      const code = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")
      expect(mentionsSobProvider(code), f.replace(ROOT, "")).toBe(false)
    }
  })

  it("la page légale porte l'attribution, les liens officiels et la licence", () => {
    const page = read("src/app/[locale]/(public)/data-sources/page.tsx")
    for (const url of ["https://opendevdata.org", "https://github.com/electric-capital/open-dev-data", "https://creativecommons.org/licenses/by/4.0/", "https://creativecommons.org/licenses/by/4.0/legalcode"]) {
      expect(page).toContain(url)
    }
    expect(read("src/components/sections/Footer.tsx")).toContain('href="/data-sources"')
    for (const l of ["fr", "en", "es"]) {
      const m = json(`src/messages/${l}.json`).DataSources
      for (const k of ["s1Attribution", "s1Changes", "scopeText", "diasporaText", "updateText", "noExportText"]) expect(m[k], `${l}.${k}`).toBeTruthy()
      expect(m.method.length).toBeGreaterThanOrEqual(5)
      expect(m.limits.length).toBeGreaterThanOrEqual(4)
    }
  })

  it("le motif de contrôle reconnaît les mentions à écarter", () => {
    expect(mentionsSobProvider("Données Electric Capital")).toBe(true)
    expect(mentionsSobProvider("licence CC BY 4.0")).toBe(true)
    expect(mentionsSobProvider("Développeurs actifs en Afrique")).toBe(false)
  })
})

describe("relance des workflows depuis l'administration", () => {
  it("liste fermée, jeton côté serveur, erreurs lisibles", async () => {
    vi.resetModules()
    vi.doMock("server-only", () => ({}))
    vi.doMock("@/lib/env", () => ({
      env: { github: { dispatchToken: "t0ken", repository: "org/repo", ref: "main" } },
      isGithubDispatchConfigured: () => true,
    }))
    const { dispatchWorkflow } = await import("@/lib/ops/github")
    const calls: { url: string; init: RequestInit }[] = []
    const ok = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(null, { status: 204 })
    }) as unknown as typeof fetch
    expect(await dispatchWorkflow("refresh-data.yml", { force_build: "true" }, ok)).toEqual({ ok: true })
    expect(calls[0].url).toBe("https://api.github.com/repos/org/repo/actions/workflows/refresh-data.yml/dispatches")
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ ref: "main", inputs: { force_build: "true" } })
    const denied = (async () => new Response("secret detail", { status: 403 })) as unknown as typeof fetch
    const res = await dispatchWorkflow("refresh-data.yml", {}, denied)
    expect(res).toEqual({ ok: false, error: "GitHub a refusé le déclenchement (HTTP 403)." })
    // @ts-expect-error — workflow hors liste
    expect((await dispatchWorkflow("deploy.yml", {}, ok)).ok).toBe(false)
  })
})
