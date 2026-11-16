import { describe, expect, it } from "vitest"
import { filterByStatus, localDay, monthGrid, paginate, parseEventFilters, shiftMonth, yearsOf } from "@/lib/events/calendar"
import { eventText } from "@/lib/events/text"

const ev = (id: string, starts_at: string, ends_at: string | null = null, time_zone = "America/Toronto") => ({ id, starts_at, ends_at, time_zone })
const NOW = Date.parse("2026-11-15T17:00:00Z")

describe("calendrier des événements", () => {
  it("filtres d'URL validés", () => {
    expect(parseEventFilters({ vue: "mois", statut: "passes", mois: "2026-02", annee: "2025", page: "3" })).toEqual({ view: "mois", status: "passes", month: "2026-02", year: 2025, page: 3 })
    const d = parseEventFilters({ vue: "<x>", statut: "drop", mois: "2026-13", annee: "1", page: "-1" }, new Date(NOW))
    expect(d).toEqual({ view: "liste", status: "tous", month: "2026-11", year: null, page: 1 })
  })

  it("date locale selon le fuseau de l'événement", () => {
    // 2 h UTC le 1er = 21 h la veille à Toronto.
    expect(localDay("2026-12-01T02:00:00Z", "America/Toronto")).toBe("2026-11-30")
    expect(localDay("2026-12-01T02:00:00Z", "Africa/Lagos")).toBe("2026-12-01")
  })

  it("grille mensuelle lundi→dimanche, événement multi-jours, hors mois", () => {
    const grid = monthGrid("2026-11", [ev("a", "2026-11-14T23:00:00Z"), ev("b", "2026-11-28T15:00:00Z", "2026-12-01T15:00:00Z"), ev("c", "2027-01-10T15:00:00Z")])
    expect(grid[0][0].date).toBe("2026-10-26") // lundi
    const days = grid.flat()
    expect(days.find((d) => d.date === "2026-11-14")!.events.map((e) => e.id)).toEqual(["a"])
    expect(days.filter((d) => d.events.some((e) => e.id === "b")).map((d) => d.date)).toEqual(["2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01"])
    expect(days.some((d) => d.events.some((e) => e.id === "c"))).toBe(false)
    expect(grid.every((w) => w.length === 7)).toBe(true)
  })

  it("statut, années, mois voisins, pagination de l'historique", () => {
    const list = [ev("p", "2024-03-10T22:00:00Z"), ev("o", "2026-11-15T16:00:00Z", "2026-11-15T19:00:00Z"), ev("u", "2027-02-10T23:00:00Z")]
    expect(filterByStatus(list, "passes", NOW).map((e) => e.id)).toEqual(["p"])
    expect(filterByStatus(list, "en-cours", NOW).map((e) => e.id)).toEqual(["o"])
    expect(filterByStatus(list, "a-venir", NOW).map((e) => e.id)).toEqual(["u"])
    expect(yearsOf(list)).toEqual([2027, 2026, 2024])
    expect(shiftMonth("2026-12", 1)).toBe("2027-01")
    expect(shiftMonth("2026-01", -1)).toBe("2025-12")
    const many = Array.from({ length: 100 }, (_, i) => i)
    expect(paginate(many, 5)).toMatchObject({ page: 5, pages: 5 })
    expect(paginate(many, 5).items).toHaveLength(4)
    expect(paginate(many, 99).page).toBe(5)
  })
})

describe("textes d'un événement", () => {
  const base = { slug: "s", source_title: "Meetup Luma", source_description: "Une longue description ".repeat(20), event_translations: [] as { locale: string; title: string; summary: string | null; description: string | null }[] }
  it("texte Luma par défaut, complément BIB prioritaire dans la langue", () => {
    expect(eventText(base, "fr")).toMatchObject({ title: "Meetup Luma", shownLocale: "source" })
    expect(eventText(base, "fr").summary!.length).toBeLessThanOrEqual(221)
    const withFr = { ...base, event_translations: [{ locale: "fr", title: "Rencontre BIB", summary: "Résumé", description: null }] }
    expect(eventText(withFr, "fr")).toMatchObject({ title: "Rencontre BIB", summary: "Résumé" })
    expect(eventText(withFr, "en").title).toBe("Meetup Luma")
    expect(eventText({ ...withFr, source_title: null }, "en")).toMatchObject({ title: "Rencontre BIB", isFallback: true })
  })
})
