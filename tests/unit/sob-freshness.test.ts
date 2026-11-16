import { describe, expect, it } from "vitest"
import { SOB_STALE_DAYS, sobFreshness } from "@/lib/sob/freshness"

describe("ancienneté des données State of BIB", () => {
  it("calcule l'âge depuis la date de l'instantané", () => {
    expect(sobFreshness("2026-04-18", new Date("2026-11-14T12:00:00Z"))).toEqual({ ageDays: 210, stale: true })
  })
  it("récent sous le seuil", () => {
    expect(sobFreshness("2026-11-01", new Date("2026-11-14T00:00:00Z")).stale).toBe(false)
    expect(sobFreshness("2026-01-01", new Date(Date.UTC(2026, 0, 1 + SOB_STALE_DAYS))).stale).toBe(false)
    expect(sobFreshness("2026-01-01", new Date(Date.UTC(2026, 0, 2 + SOB_STALE_DAYS))).stale).toBe(true)
  })
  it("date illisible : jamais présentée comme récente", () => {
    expect(sobFreshness("", new Date())).toEqual({ ageDays: null, stale: true })
    expect(sobFreshness("18/04/2026", new Date())).toEqual({ ageDays: null, stale: true })
  })
})
