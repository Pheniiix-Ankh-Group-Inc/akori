import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  FIRST_MANAGED_VERSION,
  compareSemver,
  cutRelease,
  highestVersion,
  parseSemver,
  releaseNotes,
  releasedVersions,
  unreleasedBody,
} from "../../scripts/release/changelog.mjs"

const SAMPLE = `# Changelog

Intro.

## [Unreleased]

### Added

- Nouvelle page.

## Earlier versions

## [0.13.0] — 2026-05-18

### Fixed

- Fix cron

## [0.12.0] — 2026-04-25

- Ancien.
`

describe("versions sémantiques", () => {
  it("compare numériquement, pas alphabétiquement", () => {
    expect(compareSemver("0.14.0", "0.13.0")).toBeGreaterThan(0)
    expect(compareSemver("0.9.0", "0.13.0")).toBeLessThan(0)
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0)
  })
  it("refuse les formats non x.y.z", () => {
    expect(parseSemver("v1.0")).toBeNull()
    expect(parseSemver("1.0.0-beta")).toBeNull()
    expect(() => compareSemver("1.0", "1.0.0")).toThrow()
  })
  it("retient la plus haute version entre le CHANGELOG et package.json", () => {
    expect(releasedVersions(SAMPLE)).toEqual(["0.13.0", "0.12.0"])
    expect(highestVersion(SAMPLE, "0.3.0")).toBe("0.13.0")
    expect(highestVersion(SAMPLE, "2.0.0")).toBe("2.0.0")
  })
})

describe("préparation d'une version", () => {
  it("déplace [Unreleased] sous une section datée et laisse [Unreleased] vide", () => {
    const out = cutRelease(SAMPLE, "0.14.0", "2026-11-24")
    expect(unreleasedBody(out).trim()).toBe("")
    expect(out).toContain("## [Unreleased]\n\n## [0.14.0] — 2026-11-24\n\n### Added\n\n- Nouvelle page.")
    expect(out.indexOf("## [0.14.0]")).toBeLessThan(out.indexOf("## Earlier versions"))
    expect(releaseNotes(out, "0.14.0")).toBe("### Added\n\n- Nouvelle page.")
    // L'historique est conservé tel quel.
    expect(out).toContain("## [0.13.0] — 2026-05-18\n\n### Fixed\n\n- Fix cron")
  })
  it("refuse une section vide, une version existante ou une date invalide", () => {
    const empty = cutRelease(SAMPLE, "0.14.0", "2026-11-24")
    expect(() => cutRelease(empty, "0.15.0", "2026-11-25")).toThrow(/vide/)
    expect(() => cutRelease(SAMPLE, "0.13.0", "2026-11-24")).toThrow(/existe déjà/)
    expect(() => cutRelease(SAMPLE, "0.14.0", "24/11/2026")).toThrow(/date/)
  })
  it("renvoie null pour une version absente", () => {
    expect(releaseNotes(SAMPLE, "9.9.9")).toBeNull()
  })
})

describe("fichiers du dépôt", () => {
  const root = path.resolve(__dirname, "../..")
  const md = readFileSync(path.join(root, "CHANGELOG.md"), "utf8")
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))

  it("CHANGELOG commence par son titre et garde une section [Unreleased]", () => {
    expect(md.startsWith("# Changelog\n")).toBe(true)
    expect(() => unreleasedBody(md)).not.toThrow()
  })
  it("package.json n'est jamais en retard sur la dernière version du CHANGELOG", () => {
    expect(highestVersion(md, pkg.version)).toBe(pkg.version)
  })
  it("le workflow de release ne pousse jamais directement sur main", () => {
    const wf = readFileSync(path.join(root, ".github/workflows/release.yml"), "utf8")
    expect(wf).not.toMatch(/git push[^\n]*main/)
    expect(wf).toContain("--base develop")
    expect(wf).toContain("VERSION: ${{ inputs.version }}")
    // L'historique antérieur (jusqu'à 0.13.0) n'est jamais étiqueté après coup.
    expect(wf).toContain("compareSemver(process.env.VERSION, F) < 0")
    expect(FIRST_MANAGED_VERSION).toBe("0.14.0")
  })
})
