import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/ops/incidents", () => ({ recordIncident: vi.fn(async () => {}) }))
vi.mock("@/lib/env", () => ({ env: { luma: { calendarId: "cal-aqEzCpUP5LXSBcL", icalUrl: undefined } } }))

import { MAX_OCCURRENCES, RECURRENCE_HORIZON_DAYS, expandRrule, expandRruleDetailed, parseIcal, parseRrule, unescapeText, unfold, zonedToUtc } from "@/lib/events/ical"
import { getLumaEmbedUrl } from "@/lib/luma"
import { FakeDb } from "./helpers/fake-supabase"
import { assertLumaFeedUrl, lumaFeedUrl, normalizeEvent, plainText, slugify } from "@/lib/events/luma-normalize"
import { fetchWithRetry, runLumaSync } from "@/lib/events/luma-sync"

// Flux fictif au format Luma (valeurs de test uniquement).
const FEED = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Luma//EN",
  "X-WR-CALNAME:Black in Blockchain",
  "X-WR-TIMEZONE:America/Toronto",
  "BEGIN:VEVENT",
  "UID:evt-past@events.lu.ma",
  "DTSTAMP:20261115T120000Z",
  "DTSTART:20240310T220000Z",
  "DTEND:20240311T000000Z",
  "SUMMARY:Atelier Web3 \\, Toronto",
  "DESCRIPTION:Get up-to-date information at: https://lu.ma/abc123\\n\\nUne soirée",
  "  d'échange.",
  "LOCATION:MaRS Discovery District\\, 101 College St",
  "URL:https://lu.ma/abc123",
  "ATTENDEE;CN=Personne Privée:mailto:privee@example.com",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:evt-future@events.lu.ma",
  "DTSTART;TZID=America/Toronto:20270310T183000",
  "DTEND;TZID=America/Toronto:20270310T210000",
  "SUMMARY:Meetup BIB (après passage à l'heure d'été)",
  "LOCATION:https://zoom.us/j/123",
  "STATUS:CONFIRMED",
  "SEQUENCE:2",
  "LAST-MODIFIED:20261101T100000Z",
  "BEGIN:VALARM",
  "TRIGGER:-PT15M",
  "SUMMARY:Rappel imbriqué ignoré",
  "END:VALARM",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:evt-cancel@events.lu.ma",
  "DTSTART;VALUE=DATE:20270401",
  "DTEND;VALUE=DATE:20270402",
  "SUMMARY:Journée annulée",
  "STATUS:CANCELLED",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:serie@events.lu.ma",
  "DTSTART;TZID=America/Toronto:20270105T190000",
  "DURATION:PT1H30M",
  "RRULE:FREQ=WEEKLY;COUNT=4",
  "EXDATE;TZID=America/Toronto:20270112T190000",
  "SUMMARY:Club hebdomadaire",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:serie@events.lu.ma",
  "RECURRENCE-ID;TZID=America/Toronto:20270119T190000",
  "DTSTART;TZID=America/Toronto:20270119T200000",
  "DTEND;TZID=America/Toronto:20270119T213000",
  "SUMMARY:Club hebdomadaire (décalé)",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "SUMMARY:Sans UID",
  "DTSTART:20270101T000000Z",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n")

const NOW = Date.parse("2026-11-15T12:00:00Z")

describe("iCal : lecture du flux", () => {
  it("dépliage, échappements et paramètres", () => {
    expect(unfold("A:1\r\n 2\r\nB:3")).toEqual(["A:12", "B:3"])
    expect(unescapeText("a\\, b\\; c\\nd\\\\e")).toBe("a, b; c\nd\\e")
  })

  it("événements, dates, fuseaux, statut ; participants jamais lus", () => {
    const cal = parseIcal(FEED, NOW)
    expect(cal.name).toBe("Black in Blockchain")
    const past = cal.events.find((e) => e.uid === "evt-past@events.lu.ma")!
    expect(past.summary).toBe("Atelier Web3 , Toronto")
    expect(past.description).toContain("Une soirée d'échange.")
    expect(past.location).toBe("MaRS Discovery District, 101 College St")
    expect(past.url).toBe("https://lu.ma/abc123")
    expect(JSON.stringify(cal)).not.toContain("privee@example.com")
    // 18:30 à Toronto le 10 mars 2027 = encore heure normale (UTC−5, passage le 14 mars) → 23:30Z.
    const future = cal.events.find((e) => e.uid === "evt-future@events.lu.ma")!
    expect(future.start).toBe("2027-03-10T23:30:00.000Z")
    expect(future.sequence).toBe(2)
    expect(future.summary).not.toContain("Rappel")
    const cancelled = cal.events.find((e) => e.uid === "evt-cancel@events.lu.ma")!
    expect(cancelled).toMatchObject({ status: "cancelled", allDay: true, start: "2027-04-01T00:00:00.000Z" })
    expect(cal.warnings.some((w) => w.includes("UID"))).toBe(true)
  })

  it("récurrence : occurrences développées, exclusion et occurrence modifiée", () => {
    const occ = parseIcal(FEED, NOW).events.filter((e) => e.recurrenceUid === "serie@events.lu.ma")
    expect(occ.map((e) => e.start)).toEqual([
      "2027-01-06T00:00:00.000Z",
      "2027-01-20T01:00:00.000Z", // occurrence décalée (RECURRENCE-ID)
      "2027-01-27T00:00:00.000Z",
    ])
    expect(occ[1].summary).toContain("décalé")
    expect(occ[0].end).toBe("2027-01-06T01:30:00.000Z")
    expect(new Set(occ.map((e) => e.uid)).size).toBe(3)
  })

  it("règle bornée : jamais infinie, respect des changements d'heure", () => {
    const rule = parseRrule("FREQ=DAILY")!
    const start = zonedToUtc(2027, 3, 13, 19, 0, 0, "America/Toronto")
    const occ = expandRrule(start, "America/Toronto", rule, NOW)
    expect(occ.length).toBeLessThanOrEqual(RECURRENCE_HORIZON_DAYS + 1)
    expect(new Date(occ[0]).toISOString()).toBe("2027-03-14T00:00:00.000Z") // 19h EST
    expect(new Date(occ[1]).toISOString()).toBe("2027-03-14T23:00:00.000Z") // 19h EDT
    expect(parseRrule("FREQ=SECONDLY")).toBeNull()
  })

  it("flux invalide ou tronqué refusé", () => {
    expect(() => parseIcal("<html>Not found</html>")).toThrow(/VCALENDAR/)
    expect(() => parseIcal("BEGIN:VCALENDAR\r\nBEGIN:VEVENT")).toThrow(/tronqué/)
  })

  it("UID en double : dernière version (SEQUENCE) retenue", () => {
    const dup = FEED.replace("END:VCALENDAR", "BEGIN:VEVENT\r\nUID:evt-past@events.lu.ma\r\nSEQUENCE:5\r\nDTSTART:20240310T230000Z\r\nSUMMARY:Atelier reporté\r\nEND:VEVENT\r\nEND:VCALENDAR")
    const cal = parseIcal(dup, NOW)
    expect(cal.events.filter((e) => e.uid === "evt-past@events.lu.ma")).toHaveLength(1)
    expect(cal.events.find((e) => e.uid === "evt-past@events.lu.ma")!.summary).toBe("Atelier reporté")
  })

  it("grand historique : aucune limite arbitraire", () => {
    const many = ["BEGIN:VCALENDAR"]
    for (let i = 0; i < 1500; i++) many.push("BEGIN:VEVENT", `UID:e${i}@lu.ma`, `DTSTART:2020${String((i % 12) + 1).padStart(2, "0")}01T120000Z`, `SUMMARY:E${i}`, "END:VEVENT")
    many.push("END:VCALENDAR")
    expect(parseIcal(many.join("\r\n"), NOW).events).toHaveLength(1500)
  })
})

describe("normalisation et empreinte", () => {
  const cal = parseIcal(FEED, NOW)
  const future = cal.events.find((e) => e.uid === "evt-future@events.lu.ma")!

  it("format, slug, URL Luma, mode, texte brut", () => {
    const n = normalizeEvent(future, "America/Toronto")
    expect(n.mode).toBe("online")
    expect(n.slug_base).toBe("meetup-bib-apres-passage-a-l-heure-d-ete")
    expect(n.time_zone).toBe("America/Toronto")
    expect(normalizeEvent(cal.events.find((e) => e.uid === "evt-past@events.lu.ma")!, "America/Toronto")).toMatchObject({ mode: "in_person", url: "https://lu.ma/abc123" })
    expect(slugify("!!!")).toBe("evenement")
    expect(plainText("<p>Bonjour&nbsp;<b>BIB</b></p><script>alert(1)</script>")).toBe("Bonjour BIB")
  })

  it("empreinte stable (idempotence) et sensible aux modifications", () => {
    const a = normalizeEvent(future, "America/Toronto").hash
    expect(normalizeEvent({ ...future }, "America/Toronto").hash).toBe(a)
    expect(normalizeEvent({ ...future, sequence: 9, lastModified: "2030-01-01T00:00:00.000Z" }, "America/Toronto").hash).toBe(a)
    expect(normalizeEvent({ ...future, start: "2027-03-17T22:30:00.000Z" }, "America/Toronto").hash).not.toBe(a)
    expect(normalizeEvent({ ...future, status: "cancelled" }, "America/Toronto").hash).not.toBe(a)
  })

  it("URL du flux : hôtes Luma uniquement, candidate signalée", () => {
    expect(lumaFeedUrl(undefined, "cal-aqEzCpUP5LXSBcL")).toEqual({ url: "https://api.lu.ma/ics/get?entity=calendar&id=cal-aqEzCpUP5LXSBcL", candidate: false })
    expect(lumaFeedUrl(undefined, "cal-OtherVerifiedId123").candidate).toBe(true)
    expect(lumaFeedUrl("https://api.lu.ma/ics/get?entity=calendar&id=cal-aqEzCpUP5LXSBcL", "cal-aqEzCpUP5LXSBcL").candidate).toBe(false)
    expect(() => lumaFeedUrl("https://api.lu.ma/ics/get?entity=calendar&id=cal-AnotherCalendar123", "cal-aqEzCpUP5LXSBcL")).toThrow(/ne correspond pas/)
    expect(() => lumaFeedUrl("https://api.lu.ma/ics/get?x=1", "cal-aqEzCpUP5LXSBcL")).toThrow(/ne correspond pas/)
    expect(() => assertLumaFeedUrl("https://evil.example/ics")).toThrow(/non autorisé/)
    expect(() => assertLumaFeedUrl("http://lu.ma/ics")).toThrow(/non autorisé/)
    expect(() => assertLumaFeedUrl("https://user:pw@lu.ma/ics")).toThrow(/non autorisé/)
    expect(() => lumaFeedUrl(undefined, "../../x")).toThrow()
  })
})

// Client Supabase simulé : enregistre les écritures sur event_sync_runs et la RPC.
/**
 * Base simulée : journal des exécutions + les deux RPC. begin_event_sync_run
 * reproduit le verrou de la migration 0012 (une seule exécution « running »).
 */
function fakeAdmin(opts: { running?: boolean; rpcError?: string; previousFeed?: number; legacy?: boolean } = {}) {
  const db = new FakeDb()
  const rpc: Record<string, unknown>[] = []
  if (opts.running) db.table("event_sync_runs").push({ id: "run-busy", status: "running", trigger: "schedule", started_at: new Date(NOW).toISOString() })
  if (opts.previousFeed) db.table("event_sync_runs").push({ id: "run-prev", status: "succeeded", trigger: "schedule", started_at: "2026-11-01T00:00:00Z", feed_events: opts.previousFeed })
  if (!opts.legacy) {
    db.rpcs.begin_event_sync_run = (a) => {
      const runs = db.table("event_sync_runs")
      if (runs.some((r) => r.status === "running")) return null
      runs.push({ id: "run-1", status: "running", trigger: a.p_trigger, requested_by: a.p_requested_by, started_at: new Date(NOW).toISOString() })
      return "run-1"
    }
  }
  db.rpcs.sync_luma_events = (a) => {
    rpc.push({ name: "sync_luma_events", ...a })
    if (opts.rpcError) throw new Error(opts.rpcError)
    const run = db.table("event_sync_runs").find((r) => r.id === a.p_run_id)
    if (run) run.feed_events = (a.p_events as unknown[]).length
    return { created: 6, updated: 0, unchanged: 0, cancelled: 1, missing: 0, restored: 0 }
  }
  db.table("ops_incidents")
  const runs = () => db.table("event_sync_runs")
  return { admin: db as never, db, calls: { rpc, runs, incidents: () => db.table("ops_incidents") } }
}

const feedOk = async () => ({ text: FEED, finalUrl: "https://api.lu.ma/ics/get" })

describe("orchestration de la synchronisation", () => {
  it("import complet : RPC appelée avec le flux entier, journal réussi", async () => {
    const { admin, calls } = fakeAdmin()
    const r = await runLumaSync({ trigger: "schedule", now: new Date(NOW) }, { admin, fetchFn: feedOk })
    expect(r).toMatchObject({ ok: true, runId: "run-1", feedEvents: 6, candidateUrl: false })
    expect(calls.rpc[0]).toMatchObject({ name: "sync_luma_events", p_run_id: "run-1", p_complete: true })
    expect((calls.rpc[0].p_events as unknown[]).length).toBe(6)
    expect(calls.runs().find((x) => x.id === "run-1")!.status).toBe("succeeded")
    expect(r.warnings.some((w) => w.includes("LUMA_ICAL_URL"))).toBe(false)
  })

  it("import manuel d'un fichier .ics : jamais « complet » (aucun événement marqué absent)", async () => {
    const { admin, calls } = fakeAdmin()
    await runLumaSync({ trigger: "upload", icsText: FEED, now: new Date(NOW) }, { admin })
    expect(calls.rpc[0].p_complete).toBe(false)
  })

  it("verrou atomique : une exécution déjà en cours bloque la suivante", async () => {
    const { admin, calls } = fakeAdmin({ running: true })
    const r = await runLumaSync({ trigger: "manual", now: new Date(NOW) }, { admin, fetchFn: feedOk })
    expect(r).toMatchObject({ ok: true, skipped: "running" })
    expect(calls.rpc).toHaveLength(0)
    expect(calls.runs()).toHaveLength(1)
  })

  it("synchronisations concurrentes : une seule écrit, l'autre est ignorée sans erreur", async () => {
    const { admin, calls } = fakeAdmin()
    const slow = async () => {
      await new Promise((res) => setTimeout(res, 5))
      return { text: FEED, finalUrl: "https://api.lu.ma/ics/get" }
    }
    const [a, b] = await Promise.all([
      runLumaSync({ trigger: "schedule", now: new Date(NOW) }, { admin, fetchFn: slow }),
      runLumaSync({ trigger: "manual", now: new Date(NOW) }, { admin, fetchFn: slow }),
    ])
    expect([a.skipped, b.skipped].filter(Boolean)).toEqual(["running"])
    expect(calls.rpc).toHaveLength(1)
    expect(calls.runs().filter((x) => x.status === "running")).toHaveLength(0)
  })

  it("reprise après erreur : l'exécution en échec est close et la suivante démarre", async () => {
    const { admin, calls } = fakeAdmin()
    const bad = await runLumaSync({ trigger: "schedule", now: new Date(NOW) }, { admin, fetchFn: async () => ({ text: "<html>", finalUrl: "https://api.lu.ma/x" }) })
    expect(bad.ok).toBe(false)
    expect(calls.runs()[0].status).toBe("failed")
    calls.runs()[0].id = "run-0"
    const good = await runLumaSync({ trigger: "schedule", now: new Date(NOW) }, { admin, fetchFn: feedOk })
    expect(good.ok).toBe(true)
    expect(calls.rpc).toHaveLength(1)
  })

  it("flux invalide : échec journalisé, incident, aucune écriture d'événement", async () => {
    const { admin, calls } = fakeAdmin()
    const r = await runLumaSync({ trigger: "schedule", now: new Date(NOW) }, { admin, fetchFn: async () => ({ text: "<html>", finalUrl: "https://api.lu.ma/x" }) })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/flux invalide/)
    expect(calls.rpc).toHaveLength(0)
    expect(calls.runs()[0]).toMatchObject({ status: "failed" })
  })

  it("flux tronqué (VEVENT non terminé) : refusé avant toute écriture", async () => {
    const { admin, calls } = fakeAdmin()
    const cut = FEED.slice(0, FEED.lastIndexOf("END:VEVENT")) + "END:VCALENDAR"
    const r = await runLumaSync({ trigger: "schedule", now: new Date(NOW) }, { admin, fetchFn: async () => ({ text: cut, finalUrl: "https://api.lu.ma/x" }) })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/tronqué/)
    expect(calls.rpc).toHaveLength(0)
  })

  it("flux vide : échec sans écriture", async () => {
    const { admin, calls } = fakeAdmin()
    const empty = ["BEGIN:VCALENDAR", "END:VCALENDAR"].join(String.fromCharCode(13, 10))
    const r = await runLumaSync({ trigger: "schedule", now: new Date(NOW) }, {
      admin, fetchFn: async () => ({ text: empty, finalUrl: "https://api.lu.ma/ics/get" }),
    })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/vide/)
    expect(calls.rpc).toHaveLength(0)
  })

  it("flux anormalement réduit : traité comme partiel (aucun absent), avertissement", async () => {
    const { admin, calls } = fakeAdmin({ previousFeed: 40 })
    const r = await runLumaSync({ trigger: "schedule", now: new Date(NOW) }, { admin, fetchFn: feedOk })
    expect(r.ok).toBe(true)
    expect(calls.rpc[0].p_complete).toBe(false)
    expect(r.warnings.join(" ")).toMatch(/anormalement réduit/)
  })

  it("flux de taille comparable : synchronisation complète", async () => {
    const { admin, calls } = fakeAdmin({ previousFeed: 7 })
    await runLumaSync({ trigger: "schedule", now: new Date(NOW) }, { admin, fetchFn: feedOk })
    expect(calls.rpc[0].p_complete).toBe(true)
  })

  it("base sans migration 0012 : verrou non atomique refusé", async () => {
    const { admin, calls } = fakeAdmin({ legacy: true })
    const r = await runLumaSync({ trigger: "schedule", now: new Date(NOW) }, { admin, fetchFn: feedOk })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/migration 0012/)
    expect(calls.rpc).toHaveLength(0)
  })

  it("refus de la base (ex. flux vide) : échec journalisé", async () => {
    const { admin, calls } = fakeAdmin({ rpcError: "empty feed refused" })
    const r = await runLumaSync({ trigger: "schedule", now: new Date(NOW) }, { admin, fetchFn: feedOk })
    expect(r).toMatchObject({ ok: false })
    const run = calls.runs().find((x) => x.id === "run-1")!
    expect(run.status).toBe("failed")
    expect(String(run.error)).toContain("empty feed")
  })

  it("reprise : erreur réseau transitoire puis succès ; refus de sécurité non réessayé", async () => {
    let n = 0
    const flaky = async () => {
      n++
      if (n < 3) throw new Error("http_503")
      return { text: FEED, finalUrl: "https://api.lu.ma/x" }
    }
    const r = await fetchWithRetry("https://api.lu.ma/x", flaky, async () => {})
    expect(r.text).toBe(FEED)
    expect(n).toBe(3)
    let m = 0
    await expect(fetchWithRetry("https://x", async () => (m++, Promise.reject(new Error("private_address"))), async () => {})).rejects.toThrow()
    expect(m).toBe(1)
  })
})

const cal = (...vevents: string[][]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "X-WR-TIMEZONE:America/Toronto", ...vevents.flatMap((v) => ["BEGIN:VEVENT", ...v, "END:VEVENT"]), "END:VCALENDAR"].join("\r\n")

describe("récurrences, exceptions et bornes explicites", () => {
  it("RDATE : dates supplémentaires ajoutées à la série, EXDATE retirée", () => {
    const c = parseIcal(cal(["UID:r1@lu.ma", "DTSTART;TZID=America/Toronto:20270105T180000", "DTEND;TZID=America/Toronto:20270105T200000", "RRULE:FREQ=WEEKLY;COUNT=3", "RDATE;TZID=America/Toronto:20270301T180000,20270302T180000", "EXDATE;TZID=America/Toronto:20270112T180000", "SUMMARY:Série"]), NOW)
    const starts = c.events.map((e) => e.start)
    expect(starts).toEqual(["2027-01-05T23:00:00.000Z", "2027-01-19T23:00:00.000Z", "2027-03-01T23:00:00.000Z", "2027-03-02T23:00:00.000Z"])
    expect(c.events.every((e) => e.recurrenceUid === "r1@lu.ma")).toBe(true)
    // Durée conservée pour chaque occurrence.
    expect(c.events[2].end).toBe("2027-03-02T01:00:00.000Z")
  })

  it("RDATE sans RRULE : chaque date devient une occurrence", () => {
    const c = parseIcal(cal(["UID:r2@lu.ma", "DTSTART:20270105T180000Z", "RDATE:20270205T180000Z", "SUMMARY:Deux dates"]), NOW)
    expect(c.events.map((e) => e.uid)).toEqual(["r2@lu.ma#2027-01-05T18:00:00.000Z", "r2@lu.ma#2027-02-05T18:00:00.000Z"])
  })

  it("MONTHLY par nième jour de semaine (2TU, -1FR), avec changement d'heure", () => {
    const start = zonedToUtc(2027, 2, 9, 18, 0, 0, "America/Toronto") // 2e mardi de février
    const occ = expandRrule(start, "America/Toronto", parseRrule("FREQ=MONTHLY;BYDAY=2TU;COUNT=3")!, NOW)
    expect(occ.map((m) => new Date(m).toISOString())).toEqual(["2027-02-09T23:00:00.000Z", "2027-03-09T23:00:00.000Z", "2027-04-13T22:00:00.000Z"])
    const last = expandRrule(zonedToUtc(2027, 1, 29, 12, 0, 0, "UTC"), "UTC", parseRrule("FREQ=MONTHLY;BYDAY=-1FR;COUNT=3")!, NOW)
    expect(last.map((m) => new Date(m).toISOString().slice(0, 10))).toEqual(["2027-01-29", "2027-02-26", "2027-03-26"])
  })

  it("occurrence déplacée (RECURRENCE-ID) : remplace la date calculée, sans doublon", () => {
    const c = parseIcal(cal(
      ["UID:r3@lu.ma", "DTSTART:20270105T180000Z", "RRULE:FREQ=WEEKLY;COUNT=3", "SUMMARY:Hebdo"],
      ["UID:r3@lu.ma", "RECURRENCE-ID:20270112T180000Z", "DTSTART:20270113T190000Z", "SUMMARY:Hebdo (déplacé)"],
    ), NOW)
    expect(c.events).toHaveLength(3)
    const moved = c.events.find((e) => e.uid === "r3@lu.ma#2027-01-12T18:00:00.000Z")!
    expect(moved.start).toBe("2027-01-13T19:00:00.000Z")
    expect(moved.summary).toBe("Hebdo (déplacé)")
  })

  it("règle non prise en charge : première occurrence seule + avertissement (jamais un calcul faux)", () => {
    for (const r of ["FREQ=MONTHLY;BYSETPOS=1;BYDAY=MO", "FREQ=MONTHLY;BYMONTHDAY=1,15", "FREQ=YEARLY;BYMONTH=3", "FREQ=WEEKLY;BYDAY=2TU"]) {
      expect(parseRrule(r), r).toBeNull()
    }
    const c = parseIcal(cal(["UID:r4@lu.ma", "DTSTART:20270105T180000Z", "RRULE:FREQ=MONTHLY;BYSETPOS=1;BYDAY=MO", "SUMMARY:Complexe"]), NOW)
    expect(c.events).toHaveLength(1)
    expect(c.warnings.join(" ")).toMatch(/non prise en charge/)
  })

  it("série longue : tout le passé est conservé, le futur borné par l'horizon et signalé", () => {
    const start = Date.UTC(2021, 0, 4, 18)
    const exp = expandRruleDetailed(start, "UTC", parseRrule("FREQ=WEEKLY")!, NOW)
    expect(new Date(exp.occurrences[0]).toISOString()).toBe("2021-01-04T18:00:00.000Z")
    expect(exp.truncated).toBe("horizon")
    const lastMs = exp.occurrences[exp.occurrences.length - 1]
    expect(lastMs).toBeLessThanOrEqual(NOW + RECURRENCE_HORIZON_DAYS * 86_400_000)
    expect(lastMs).toBeGreaterThan(NOW + (RECURRENCE_HORIZON_DAYS - 8) * 86_400_000)
    // Plus de 6 ans d'historique hebdomadaire, sans plafond de 500.
    expect(exp.occurrences.filter((m) => m < NOW).length).toBeGreaterThan(300)
  })

  it("garde-fou : une troncature est toujours signalée", () => {
    const exp = expandRruleDetailed(Date.UTC(2000, 0, 1), "UTC", parseRrule("FREQ=DAILY")!, NOW)
    expect(exp.occurrences).toHaveLength(MAX_OCCURRENCES)
    expect(exp.truncated).toBe("cap")
    const c = parseIcal(cal(["UID:r5@lu.ma", "DTSTART:20000101T000000Z", "RRULE:FREQ=DAILY", "SUMMARY:Quotidien"]), NOW)
    expect(c.warnings.join(" ")).toMatch(/tronquée au garde-fou/)
  })

  it("événement multijours et journée entière", () => {
    const c = parseIcal(cal(
      ["UID:m1@lu.ma", "DTSTART;VALUE=DATE:20270610", "DTEND;VALUE=DATE:20270613", "SUMMARY:Conférence"],
      ["UID:m2@lu.ma", "DTSTART;TZID=America/Toronto:20270610T090000", "DTEND;TZID=America/Toronto:20270612T170000", "SUMMARY:Hackathon"],
    ), NOW)
    const conf = c.events.find((e) => e.uid === "m1@lu.ma")!
    expect(conf.allDay).toBe(true)
    expect(new Date(conf.end!).getTime() - new Date(conf.start).getTime()).toBe(3 * 86_400_000)
    const hack = c.events.find((e) => e.uid === "m2@lu.ma")!
    expect(hack.start).toBe("2027-06-10T13:00:00.000Z")
    expect(hack.end).toBe("2027-06-12T21:00:00.000Z")
  })
})

describe("intégration Luma conservée depuis main", () => {
  it("getLumaEmbedUrl : même URL d'embed, même calendrier", () => {
    expect(getLumaEmbedUrl("cal-aqEzCpUP5LXSBcL")).toBe("https://lu.ma/embed/calendar/cal-aqEzCpUP5LXSBcL/events")
  })

  it("identifiant invalide refusé (aucune URL construite)", () => {
    expect(getLumaEmbedUrl("cal-x/../evil")).toBeNull()
    expect(getLumaEmbedUrl("")).toBeNull()
  })
})

