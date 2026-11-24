import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { cityName, countryName, localizeSnapshot } from "@/lib/geo/names"
import { SCOPE_COUNTRIES } from "@/lib/sob/scope"

const root = path.resolve(__dirname, "../..")

describe("noms localisés State of BIB", () => {
  it("traduit les pays par code ISO en FR et ES, garde l'anglais en EN", () => {
    expect(countryName("EGY", "Egypt", "fr")).toBe("Égypte")
    expect(countryName("ZAF", "South Africa", "es")).toBe("Sudáfrica")
    expect(countryName("EGY", "Egypt", "en")).toBe("Egypt")
    expect(countryName("XXX", "Nowhere", "fr")).toBe("Nowhere")
  })

  it("traduit les exonymes de villes connues et garde les autres", () => {
    expect(cityName("Cairo", "fr")).toBe("Le Caire")
    expect(cityName("Cape Town", "es")).toBe("Ciudad del Cabo")
    expect(cityName("Lagos", "fr")).toBe("Lagos")
    expect(cityName("Cairo", "en")).toBe("Cairo")
  })

  it("couvre tous les pays du périmètre du pipeline", () => {
    const py = readFileSync(path.join(root, "data-pipeline/country_scope.py"), "utf8")
    const block = (name: string) => py.split(`${name} = [`)[1].split("]")[0]
    const codes = [...block("AFRICA_ISO_A3").matchAll(/"([A-Z]{3})"/g), ...block("CARIBBEAN_ISO_A3").matchAll(/"([A-Z]{3})"/g)].map((m) => m[1])
    expect(codes.length).toBe(SCOPE_COUNTRIES)
    for (const iso of codes) expect(countryName(iso, iso, "fr"), iso).not.toBe(iso)
  })

  it("localise un instantané sans toucher aux codes ni aux valeurs", () => {
    const snap = {
      countryMap: [{ iso_a3: "EGY", name: "Egypt", devs_active_28d: 3 }],
      topCities: [{ city: "Cairo", country: "Egypt", iso_a3: "EGY", devs_active_28d: 3 }],
    }
    const out = localizeSnapshot(snap, "fr")
    expect(out.countryMap[0]).toEqual({ iso_a3: "EGY", name: "Égypte", devs_active_28d: 3 })
    expect(out.topCities[0]).toMatchObject({ city: "Le Caire", country: "Égypte", iso_a3: "EGY" })
    expect(localizeSnapshot(snap, "en")).toBe(snap)
  })
})
