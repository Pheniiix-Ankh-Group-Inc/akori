#!/usr/bin/env node
// Prépare une version : CHANGELOG ([Unreleased] → [x.y.z] — date) et package.json.
// Usage : pnpm release:prepare 0.14.0
// Le tag et la release GitHub sont créés plus tard, à l'arrivée sur main
// (.github/workflows/release.yml).
import { readFileSync, writeFileSync } from "node:fs"
import { FIRST_MANAGED_VERSION, compareSemver, cutRelease, highestVersion, parseSemver, releaseNotes } from "./changelog.mjs"

const version = (process.argv[2] ?? "").replace(/^v/, "")
if (!parseSemver(version)) {
  console.error("Usage : pnpm release:prepare <x.y.z>   (exemple : 0.14.0)")
  process.exit(1)
}

const pkgPath = new URL("../../package.json", import.meta.url)
const logPath = new URL("../../CHANGELOG.md", import.meta.url)
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
const md = readFileSync(logPath, "utf8")

const highest = highestVersion(md, pkg.version)
if (highest && compareSemver(version, highest) <= 0) {
  console.error(`La version ${version} doit être supérieure à ${highest} (dernière version connue).`)
  process.exit(1)
}

if (compareSemver(version, FIRST_MANAGED_VERSION) < 0) {
  console.error(`La première version étiquetée est ${FIRST_MANAGED_VERSION} : choisir ${FIRST_MANAGED_VERSION} ou plus.`)
  process.exit(1)
}

const date = new Date().toISOString().slice(0, 10)
let next
try {
  next = cutRelease(md, version, date)
} catch (e) {
  console.error(`Préparation impossible : ${e.message}`)
  process.exit(1)
}

writeFileSync(logPath, next)
pkg.version = version
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

const lines = releaseNotes(next, version).split("\n").length
console.log(`Version ${version} préparée (${date}) : CHANGELOG.md (${lines} lignes de notes) et package.json.`)
