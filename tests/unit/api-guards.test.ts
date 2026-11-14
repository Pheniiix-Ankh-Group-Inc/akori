import { describe, expect, it } from "vitest"
import { clientIp, consumeRateLimit, isPlausibleIp, isSameOrigin } from "@/lib/security/rate-limit"
import { editorialErrorMessage, expectedUpdatedAt } from "@/lib/editorial/rpc"

describe("limitation de débit", () => {
  it("échoue fermé en production sans limiteur partagé", async () => {
    expect(await consumeRateLimit("k1", 5, 60, { production: true })).toBe("unavailable")
  })
  it("compteur local en développement : autorise puis limite, fenêtre réinitialisée", async () => {
    const t0 = Date.UTC(2026, 10, 13, 12, 0, 0)
    for (let i = 0; i < 3; i++) expect(await consumeRateLimit("k2", 3, 60, { production: false, now: t0 + i })).toBe("allowed")
    expect(await consumeRateLimit("k2", 3, 60, { production: false, now: t0 + 10 })).toBe("limited")
    expect(await consumeRateLimit("k2", 3, 60, { production: false, now: t0 + 61_000 })).toBe("allowed")
  })
  it("appels concurrents : jamais plus que la limite", async () => {
    const now = Date.UTC(2026, 10, 13, 13, 0, 0)
    const results = await Promise.all(Array.from({ length: 20 }, () => consumeRateLimit("k3", 5, 60, { production: false, now })))
    expect(results.filter((r) => r === "allowed").length).toBe(5)
  })
})

describe("adresse IP", () => {
  it("valide les en-têtes et ignore les valeurs falsifiées", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9")
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" }))).toBe("198.51.100.7")
    expect(clientIp(new Headers({ "x-forwarded-for": "<script>, 1.2.3.4" }))).toBe("unknown")
    expect(clientIp(new Headers())).toBe("unknown")
    expect(isPlausibleIp("a".repeat(100))).toBe(false)
  })
})

describe("CSRF", () => {
  it("exige la même origine", () => {
    expect(isSameOrigin(new Headers({ origin: "https://evil.example" }), "https://anbachain.org/api/newsletter")).toBe(false)
    expect(isSameOrigin(new Headers(), "https://anbachain.org/api/newsletter")).toBe(false)
    expect(isSameOrigin(new Headers({ origin: "https://anbachain.org" }), "https://anbachain.org/api/newsletter")).toBe(true)
  })
})

describe("erreurs éditoriales", () => {
  it("traduit les codes sans divulguer de détail SQL", () => {
    expect(editorialErrorMessage({ code: "BIB01", message: "concurrent modification" })).toMatch(/modifié par une autre personne/)
    expect(editorialErrorMessage({ code: "BIB03" })).toMatch(/média/)
    expect(editorialErrorMessage({ code: "XX000", message: "relation secret_table" })).toBe("Enregistrement impossible.")
    expect(editorialErrorMessage(null, "Défaut")).toBe("Défaut")
  })
  it("lit l'horodatage du verrou optimiste", () => {
    const fd = new FormData()
    fd.set("expected_updated_at", "2026-11-13T10:00:00.123456+00:00")
    expect(expectedUpdatedAt(fd)).toBe("2026-11-13T10:00:00.123456+00:00")
    fd.set("expected_updated_at", "'; drop table events; --")
    expect(expectedUpdatedAt(fd)).toBeNull()
  })
})
