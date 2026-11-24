// Outils de version pour CHANGELOG.md (format Keep a Changelog).
// Aucun accès réseau : lecture et transformation de texte uniquement.

/** Première version étiquetée : l'historique antérieur n'a pas de tag Git. */
export const FIRST_MANAGED_VERSION = "0.14.0"

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/
const UNRELEASED = /^## \[Unreleased\][^\n]*\n/m

/** Décompose "1.2.3" ; null si la chaîne n'est pas une version x.y.z. */
export function parseSemver(version) {
  const m = SEMVER.exec(String(version).trim())
  return m ? m.slice(1, 4).map(Number) : null
}

/** <0 si a < b, 0 si égales, >0 si a > b. */
export function compareSemver(a, b) {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  if (!pa || !pb) throw new Error(`version invalide : ${!pa ? a : b}`)
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
  return 0
}

/** Versions déjà publiées dans le CHANGELOG (titres "## [x.y.z]"). */
export function releasedVersions(md) {
  return [...md.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1])
}

/** Plus haute version connue parmi le CHANGELOG et les versions fournies. */
export function highestVersion(md, ...others) {
  const all = [...releasedVersions(md), ...others.filter((v) => parseSemver(v))]
  return all.reduce((max, v) => (max === null || compareSemver(v, max) > 0 ? v : max), null)
}

function sectionBounds(md, headingRe) {
  const m = headingRe.exec(md)
  if (!m) return null
  const bodyStart = m.index + m[0].length
  const next = md.slice(bodyStart).search(/^## /m)
  const end = next === -1 ? md.length : bodyStart + next
  return { start: m.index, bodyStart, end }
}

/** Contenu de la section [Unreleased] (sans son titre). */
export function unreleasedBody(md) {
  const b = sectionBounds(md, UNRELEASED)
  if (!b) throw new Error("section ## [Unreleased] introuvable dans CHANGELOG.md")
  return md.slice(b.bodyStart, b.end)
}

/**
 * Transforme le contenu de [Unreleased] en section "## [version] — date" et
 * laisse une section [Unreleased] vide au-dessus.
 */
export function cutRelease(md, version, date) {
  if (!parseSemver(version)) throw new Error(`version invalide : ${version}`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`date invalide : ${date}`)
  if (releasedVersions(md).includes(version)) throw new Error(`la version ${version} existe déjà dans CHANGELOG.md`)
  const b = sectionBounds(md, UNRELEASED)
  if (!b) throw new Error("section ## [Unreleased] introuvable dans CHANGELOG.md")
  const body = md.slice(b.bodyStart, b.end).trim()
  if (!body) throw new Error("la section [Unreleased] est vide : rien à publier")
  const head = md.slice(0, b.start)
  const tail = md.slice(b.end)
  return `${head}## [Unreleased]\n\n## [${version}] — ${date}\n\n${body}\n\n${tail}`
}

/** Notes de version : contenu de la section "## [version]". */
export function releaseNotes(md, version) {
  const escaped = version.replace(/\./g, "\\.")
  const b = sectionBounds(md, new RegExp(`^## \\[${escaped}\\][^\\n]*\\n`, "m"))
  if (!b) return null
  const notes = md.slice(b.bodyStart, b.end).trim()
  return notes || null
}
