import { describe, expect, it } from "vitest"
import { classifyNewsIngest, classifyNewsletterStep } from "@/lib/ops/cron-outcome"

const W = "2026-11-23"

describe("cron_runs — newsletter", () => {
  it("brouillon produit : progression", () => {
    const o = classifyNewsletterStep("generate", { weekStart: W, status: "drafted", detail: "0 contrôle(s) en échec" })
    expect(o.status).toBe("success")
    expect(o.details?.outcome).toBe("progressed")
  })
  it("pause, créneau non atteint, verrou : no-op", () => {
    for (const detail of ["module en pause", "module en pause : aucun envoi", "créneau non atteint", "verrou non obtenu", "verrou détenu par une autre exécution"]) {
      const o = classifyNewsletterStep("send", { weekStart: W, status: "eligible", detail })
      expect(o.status, detail).toBe("skipped")
    }
  })
  it("cycle déjà annulé ou envoyé : terminal, jamais un échec", () => {
    for (const status of ["cancelled", "sent", "failed", "partially_sent"]) {
      const o = classifyNewsletterStep("send", { weekStart: W, status, detail: "déjà traité" })
      expect(o.status, status).toBe("skipped")
      expect(o.details?.outcome).toBe("noop")
    }
    expect(classifyNewsletterStep("check", { weekStart: W, status: "cancelled", detail: "rien à contrôler" }).status).toBe("skipped")
  })
  it("annulation ou blocage produit par cette exécution : arrêt métier, pas échec technique", () => {
    for (const [status, detail] of [["cancelled", "créneau dépassé"], ["cancelled", "autosend_disabled"], ["blocked", "ai_disabled"]] as const) {
      const o = classifyNewsletterStep("send", { weekStart: W, status, detail })
      expect(o.status).toBe("success")
      expect(o.details?.outcome).toBe("business_stop")
    }
  })
  it("envoi interrompu ou partiel : échec", () => {
    expect(classifyNewsletterStep("send", { weekStart: W, status: "failed", detail: "envoi interrompu" }).status).toBe("failed")
    expect(classifyNewsletterStep("send", { weekStart: W, status: "partially_sent" }).status).toBe("failed")
  })
})

describe("cron_runs — veille d'actualités", () => {
  const f = { source: "s", reason: "timeout" }
  it("aucune source : échec", () => {
    expect(classifyNewsIngest({ sources: 0, fetched: 0, inserted: 0, failures: [] }).status).toBe("failed")
  })
  it("toutes les sources en échec : échec", () => {
    expect(classifyNewsIngest({ sources: 2, fetched: 0, inserted: 0, failures: [f, f] }).details?.outcome).toBe("all_failed")
  })
  it("échec partiel : succès signalé partiel, erreur renseignée", () => {
    const o = classifyNewsIngest({ sources: 3, fetched: 10, inserted: 2, failures: [f] })
    expect(o.status).toBe("success")
    expect(o.details?.outcome).toBe("partial")
    expect(o.error).toMatch(/1 source/)
  })
  it("rien de nouveau (déduplication) : no-op réussi", () => {
    const o = classifyNewsIngest({ sources: 3, fetched: 10, inserted: 0, failures: [] })
    expect(o.status).toBe("success")
    expect(o.details?.outcome).toBe("noop")
  })
})
