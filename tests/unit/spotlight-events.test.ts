import { describe, expect, it } from "vitest"
import { formatSpotlightDate, selectSpotlightEvent } from "@/lib/events/spotlight"
import type { EventRecord } from "@/lib/events/types"

const date = "2026-12-10T19:00:00Z"
const event = (overrides: Partial<EventRecord> = {}): EventRecord =>
  ({
    slug: "spotlight-event",
    starts_at: date,
    ends_at: "2026-12-10T21:00:00Z",
    time_zone: "America/Toronto",
    source_status: "confirmed",
    source_title: "Founder Story Live",
    event_translations: [],
    ...overrides,
  }) as EventRecord

describe("Startup Spotlight event rendering", () => {
  const now = Date.parse("2026-11-23T12:00:00Z")

  it("selects only confirmed upcoming Spotlight events", () => {
    const e = selectSpotlightEvent([
      event({ source_status: "cancelled" }),
      event({ source_status: "tentative" }),
      event({ source_title: "Unrelated blockchain meetup" }),
      event(),
    ], "fr", now)
    expect(e?.slug).toBe("spotlight-event")
  })

  it("recognizes translations when the original source title is different", () => {
    const e = selectSpotlightEvent([
      event({ source_title: "Rencontre communautaire", event_translations: [
        { locale: "en", title: "Startup Spotlight", summary: null, description: null },
      ] }),
    ], "fr", now)
    expect(e).not.toBeNull()
  })

  it("ignores completed events and chooses the soonest valid one", () => {
    const e = selectSpotlightEvent([
      event({ slug: "past", starts_at: "2026-11-01T12:00:00Z", ends_at: null }),
      event({ slug: "later", starts_at: "2026-12-19T12:00:00Z" }),
      event({ slug: "sooner", starts_at: "2026-12-05T12:00:00Z" }),
    ], "en", now)
    expect(e?.slug).toBe("sooner")
  })

  it("never selects invalid dates", () => {
    expect(selectSpotlightEvent([event({ starts_at: "broken", ends_at: null })], "en", now)).toBeNull()
  })

  it("formats an invalid imported time zone in UTC without throwing", () => {
    expect(formatSpotlightDate(event({ time_zone: "Broken/Zone" }), "en")).toContain("UTC")
  })
})
