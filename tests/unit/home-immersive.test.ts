import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const load = (l: string) => JSON.parse(readFileSync(join(process.cwd(), "src/messages", `${l}.json`), "utf8")).Immersive
const flat = (o: Record<string, unknown>, p = ""): Record<string, string> =>
  Object.entries(o).reduce<Record<string, string>>((acc, [k, v]) => {
    if (v && typeof v === "object") Object.assign(acc, flat(v as Record<string, unknown>, `${p}${k}.`))
    else acc[`${p}${k}`] = String(v)
    return acc
  }, {})
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe("accueil Immersive Spatial Institution", () => {
  const fr = flat(load("fr"))
  it.each(["en", "es"])("%s a les mêmes clés et variables que le français", (l) => {
    const other = flat(load(l))
    expect(Object.keys(other).sort()).toEqual(Object.keys(fr).sort())
    for (const [k, v] of Object.entries(fr)) expect(vars(other[k]), k).toEqual(vars(v))
  })

  it("numérote les onze chapitres dans l'ordre de la page", () => {
    const order = ["manifesto", "mission", "axes", "founders", "events", "spotlight", "sob", "action", "resources", "newsletter"]
    order.forEach((k, i) => expect(fr[`${k}.eyebrow`]).toMatch(new RegExp(`^${String(i + 2).padStart(2, "0")} · `)))
  })

  it("rappelle que les développeurs observés ne sont pas des membres de BIB", () => {
    for (const l of ["fr", "en", "es"]) expect(flat(load(l))["sob.mainNote"]).toMatch(/BIB/)
  })
})
