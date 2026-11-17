import type { SobCity, SobCohort, SobCountry, SobEcosystemMix, SobHeadline, SobMeta } from "@/components/state-of-bib/types"

export interface SobFiles {
  meta: SobMeta
  headline: SobHeadline
  countryMap: SobCountry[]
  topCities: SobCity[]
  ecoMix: SobEcosystemMix
  cohort: SobCohort
}

/** Âge maximal d'une copie de repli affichable (jours depuis la date de l'instantané). */
export const SOB_FALLBACK_MAX_AGE_DAYS = 120

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0

/**
 * Contrôles de cohérence d'un lot State of BIB (mêmes règles que
 * data-pipeline/validate.py : `consistency_anomalies`). Renvoie les écarts ;
 * liste vide si le lot est cohérent. Aucune donnée n'est corrigée.
 */
export function snapshotProblems(f: SobFiles): string[] {
  const out: string[] = []
  const { meta, headline, countryMap, topCities, ecoMix, cohort } = f
  if (!meta || !headline || !Array.isArray(countryMap) || !Array.isArray(topCities) || !ecoMix || !cohort) return ["lot incomplet"]
  if (!countryMap.length) out.push("aucun pays")
  for (const k of ["devs_active_28d", "ecosystems", "countries", "commits_lifetime"] as const) {
    if (!isCount(headline[k])) out.push(`headline.${k} invalide`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(headline.snapshot_date ?? ""))) out.push("headline.snapshot_date invalide")
  if (headline.countries !== countryMap.length) out.push(`headline.countries=${headline.countries} mais ${countryMap.length} pays`)
  const devs = countryMap.reduce((a, c) => a + (c.devs_active_28d || 0), 0)
  if (headline.devs_active_28d !== devs) out.push(`headline.devs_active_28d=${headline.devs_active_28d} mais somme par pays=${devs}`)
  const commits = countryMap.reduce((a, c) => a + (c.commits_lifetime || 0), 0)
  if (headline.commits_lifetime !== commits) out.push(`headline.commits_lifetime=${headline.commits_lifetime} mais somme par pays=${commits}`)

  const byIso = new Map(countryMap.map((c) => [c.iso_a3, c.devs_active_28d || 0]))
  if (byIso.size !== countryMap.length) out.push("pays en double")
  const perCountry = new Map<string, number>()
  for (const c of topCities) perCountry.set(c.iso_a3, (perCountry.get(c.iso_a3) ?? 0) + (c.devs_active_28d || 0))
  for (const [iso, n] of perCountry) {
    if (!byIso.has(iso)) out.push(`ville rattachée à un pays absent (${iso})`)
    else if (n > (byIso.get(iso) ?? 0)) out.push(`villes de ${iso} : ${n} développeurs, plus que le pays`)
  }

  const months = Array.isArray(ecoMix.months) ? ecoMix.months : []
  if (JSON.stringify(months) !== JSON.stringify(cohort.months ?? [])) out.push("écosystèmes et cohortes ne couvrent pas les mêmes mois")
  if (months.some((m, i) => i > 0 && m <= months[i - 1])) out.push("mois non strictement croissants")
  for (const e of ecoMix.ecosystems ?? []) {
    if ((e.series_devs ?? []).length !== months.length) out.push(`série ${e.name} de longueur incohérente`)
    if ((e.series_devs ?? []).some((v) => typeof v !== "number" || v < 0)) out.push(`série ${e.name} avec valeur manquante ou négative`)
  }
  for (const k of ["devs_0_1y", "devs_1_2y", "devs_2y_plus"] as const) {
    const series = cohort[k] ?? []
    if (series.length !== (cohort.months ?? []).length) out.push(`cohorte ${k} de longueur incohérente`)
    if (series.some((v) => typeof v !== "number" || v < 0)) out.push(`cohorte ${k} avec valeur manquante ou négative`)
  }
  const snapMonth = String(headline.snapshot_date ?? "").slice(0, 7)
  if (months.length && snapMonth && months[months.length - 1] > snapMonth) out.push("séries au-delà de l'instantané")
  if (!(meta as { pipeline_version?: unknown }).pipeline_version) out.push("provenance absente (pipeline_version)")
  return out
}

/**
 * Une copie de repli n'est affichable que si elle est cohérente, de
 * provenance connue et suffisamment récente. Sinon le site affiche un état
 * d'indisponibilité plutôt que des chiffres non fiables.
 */
export function fallbackProblems(f: SobFiles, now: Date = new Date(), maxAgeDays = SOB_FALLBACK_MAX_AGE_DAYS): string[] {
  const out = snapshotProblems(f)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(f.headline?.snapshot_date ?? ""))
  if (m) {
    const age = Math.floor((now.getTime() - Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) / 86_400_000)
    if (age > maxAgeDays) out.push(`copie de repli périmée (${age} jours, maximum ${maxAgeDays})`)
    if (age < -1) out.push("date de l'instantané dans le futur")
  }
  return out
}
