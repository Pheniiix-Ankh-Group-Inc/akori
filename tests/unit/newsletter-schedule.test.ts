import { describe, expect, it } from "vitest"
import { sendSlotFor, sendWindowState, weekStartFor } from "@/lib/newsletter/schedule"

const at = (iso: string) => new Date(iso)

describe("créneau du mercredi 09:00 (Toronto)", () => {
  it("heure normale (EST, UTC−5)", () => {
    expect(weekStartFor(at("2026-11-16T15:00:00Z"))).toBe("2026-11-16")
    expect(sendSlotFor("2026-11-16")).toBe("2026-11-18T14:00:00.000Z")
  })
  it("heure d'été (EDT, UTC−4)", () => {
    expect(sendSlotFor("2026-07-13")).toBe("2026-07-15T13:00:00.000Z")
  })
  it("semaines de changement d'heure", () => {
    expect(sendSlotFor("2026-03-02")).toBe("2026-03-04T14:00:00.000Z") // avant le passage à l'heure d'été
    expect(sendSlotFor("2026-03-09")).toBe("2026-03-11T13:00:00.000Z") // après (8 mars)
    expect(sendSlotFor("2026-10-26")).toBe("2026-10-28T13:00:00.000Z") // avant le retour à l'heure normale
    expect(sendSlotFor("2026-11-02")).toBe("2026-11-04T14:00:00.000Z") // après (1er novembre)
  })
  it("le dimanche soir appartient encore à la semaine en cours", () => {
    expect(weekStartFor(at("2026-11-23T04:30:00Z"))).toBe("2026-11-16") // dimanche 23:30 Toronto
    expect(weekStartFor(at("2026-11-23T05:30:00Z"))).toBe("2026-11-23") // lundi 00:30 Toronto
  })
})

describe("fenêtre d'envoi", () => {
  const slot = sendSlotFor("2026-11-16")
  it.each([
    ["2026-11-18T13:59:00Z", "before"], // 08:59
    ["2026-11-18T14:00:00Z", "open"], // 09:00
    ["2026-11-18T14:59:59Z", "open"], // 09:59:59
    ["2026-11-18T15:00:00Z", "closed"], // 10:00 : aucune relance tardive
    ["2026-11-19T14:00:00Z", "closed"], // exécution retardée d'un jour
  ] as const)("%s → %s", (now, state) => {
    expect(sendWindowState(at(now), slot)).toBe(state)
  })
  it("en été, 09:00 EDT ouvre la fenêtre et 08:59 non", () => {
    const summer = sendSlotFor("2026-07-13")
    expect(sendWindowState(at("2026-07-15T12:59:00Z"), summer)).toBe("before")
    expect(sendWindowState(at("2026-07-15T13:00:00Z"), summer)).toBe("open")
  })
})
