// Fixture State of BIB COHÉRENTE pour les tests (unitaires et E2E).
// Part de la copie technique du dépôt, recalcule les totaux à partir des pays
// et date l'instantané : données de TEST, jamais publiées.
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
export const SOB_FILES = ["meta.json", "headline.json", "country_map.json", "top_cities.json", "ecosystem_mix.json", "tenure_cohort.json"]

export async function buildSobFixture({ snapshotDate = new Date().toISOString().slice(0, 10), version = "e2e-fixture" } = {}) {
  const read = async (n) => JSON.parse(await readFile(path.join(ROOT, "data/state-of-bib/current", n), "utf8"))
  const [meta, headline, countryMap, topCities, ecoMix, cohort] = await Promise.all(SOB_FILES.map(read))
  headline.countries = countryMap.length
  headline.devs_active_28d = countryMap.reduce((a, c) => a + (c.devs_active_28d || 0), 0)
  headline.commits_lifetime = countryMap.reduce((a, c) => a + (c.commits_lifetime || 0), 0)
  headline.snapshot_date = snapshotDate
  meta.dataset_version = version
  meta.pipeline_version = "test-fixture"
  // Les séries ne dépassent jamais le mois de l'instantané.
  const snapMonth = snapshotDate.slice(0, 7)
  const keep = ecoMix.months.filter((m) => m <= snapMonth).length
  ecoMix.months = ecoMix.months.slice(0, keep)
  for (const e of ecoMix.ecosystems) {
    e.series_devs = e.series_devs.slice(0, keep)
    if (e.series_indexed) e.series_indexed = e.series_indexed.slice(0, keep)
  }
  cohort.months = cohort.months.slice(0, keep)
  for (const k of ["devs_0_1y", "devs_1_2y", "devs_2y_plus"]) cohort[k] = cohort[k].slice(0, keep)
  return { meta, headline, countryMap, topCities, ecoMix, cohort }
}

export async function writeSobFixture(dir, options) {
  const f = await buildSobFixture(options)
  await mkdir(dir, { recursive: true })
  const byName = { "meta.json": f.meta, "headline.json": f.headline, "country_map.json": f.countryMap, "top_cities.json": f.topCities, "ecosystem_mix.json": f.ecoMix, "tenure_cohort.json": f.cohort }
  await Promise.all(Object.entries(byName).map(([n, v]) => writeFile(path.join(dir, n), JSON.stringify(v))))
  return dir
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2]
  if (!dir) throw new Error("usage: node tests/helpers/sob-fixture.mjs <dossier>")
  console.log(await writeSobFixture(path.resolve(dir)))
}
