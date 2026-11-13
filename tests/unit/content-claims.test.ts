import { describe, expect, it } from "vitest"
import fr from "../../src/messages/fr.json"
import en from "../../src/messages/en.json"
import es from "../../src/messages/es.json"
import { UNVERIFIED_KEYS, UNVERIFIED_SECTIONS, isKeyVisible, isSectionVisible } from "@/lib/content/claims"

type Tree = Record<string, unknown>
const get = (tree: Tree, path: string) => path.split(".").reduce<unknown>((o, k) => (o as Tree | undefined)?.[k], tree)
const flatten = (o: unknown, p = ""): [string, string][] =>
  typeof o === "string" ? [[p, o]] : o && typeof o === "object" ? Object.entries(o as Tree).flatMap(([k, v]) => flatten(v, p ? `${p}.${k}` : k)) : []

describe("registre des contenus non vérifiés", () => {
  it("masque par défaut, réaffiche sur décision explicite", () => {
    expect(isSectionVisible("Ledger", false)).toBe(false)
    expect(isSectionVisible("Ledger", true)).toBe(true)
    expect(isSectionVisible("Hero", false)).toBe(true)
    expect(isKeyVisible("Hero.meta2", false)).toBe(false)
    expect(isKeyVisible("Hero.meta1", false)).toBe(true)
  })

  it.each([["fr", fr], ["en", en], ["es", es]] as const)("chaque élément du registre existe en %s", (_, messages) => {
    for (const section of UNVERIFIED_SECTIONS) expect(get(messages as Tree, section), section).toBeTruthy()
    for (const key of Object.keys(UNVERIFIED_KEYS)) expect(typeof get(messages as Tree, key), key).toBe("string")
  })

  it("aucune affirmation chiffrée de membres/chapitres n'est affichée hors registre", () => {
    const visible = flatten(fr).filter(([k]) => {
      const section = k.split(".")[0]
      return isSectionVisible(section, false) && isKeyVisible(k, false)
    })
    const offenders = visible.filter(([, v]) => /\b\d[\d\s  ]*\s?(membres|chapitres|members|chapters)\b/i.test(v))
    expect(offenders).toEqual([])
  })
})

describe("cohérence du calendrier newsletter", () => {
  it.each([["fr", fr], ["en", en], ["es", es]] as const)("aucune mention d'un envoi le vendredi (%s)", (_, messages) => {
    const all = flatten(messages).map(([, v]) => v).join("\n")
    expect(all).not.toMatch(/vendredi|friday|viernes/i)
  })
  it("le jour annoncé est le mercredi", () => {
    expect(get(fr as Tree, "Pillars.items.p9.text")).toMatch(/mercredi à 9 h/)
    expect(get(en as Tree, "Pillars.items.p9.text")).toMatch(/Wednesdays at 9 a\.m\./)
    expect(get(es as Tree, "Pillars.items.p9.text")).toMatch(/miércoles/)
  })
  it("les trois langues ont les mêmes clés", () => {
    const keys = (m: unknown) => flatten(m).map(([k]) => k).sort()
    expect(keys(en)).toEqual(keys(fr))
    expect(keys(es)).toEqual(keys(fr))
  })
})
