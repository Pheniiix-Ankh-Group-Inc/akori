#!/usr/bin/env node
// Affiche les notes d'une version tirées de CHANGELOG.md (sortie standard).
// Usage : node scripts/release/notes.mjs 0.14.0 > notes.md
import { readFileSync } from "node:fs"
import { parseSemver, releaseNotes } from "./changelog.mjs"

const version = (process.argv[2] ?? "").replace(/^v/, "")
if (!parseSemver(version)) {
  console.error("Usage : node scripts/release/notes.mjs <x.y.z>")
  process.exit(1)
}
const md = readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8")
const notes = releaseNotes(md, version)
if (!notes) {
  console.error(`Aucune section "## [${version}]" non vide dans CHANGELOG.md.`)
  process.exit(1)
}
process.stdout.write(`${notes}\n`)
