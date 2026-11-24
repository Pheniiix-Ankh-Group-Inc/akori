import { describe, expect, it } from "vitest"
import { eventText, splitLumaDescription } from "@/lib/events/text"

// Description réelle du flux iCal Luma (édition 2, mars 2026).
const LUMA = "Get up-to-date information at: https://luma.com/y2wqdizo\n\nAddress:\n3426 R. Notre Dame O\nMontréal, Québec\nCanada\n\nHosted by events anbachain, Fadjiah Collin-Mazile & Brice Mimifir"

describe("gabarit de description Luma", () => {
  it("retire le gabarit anglais et extrait adresse et organisateurs", () => {
    expect(splitLumaDescription(LUMA)).toEqual({
      body: null,
      address: ["3426 R. Notre Dame O", "Montréal, Québec", "Canada"],
      hosts: "events anbachain, Fadjiah Collin-Mazile & Brice Mimifir",
    })
  })

  it("garde le texte écrit par l'organisateur", () => {
    const out = splitLumaDescription(`Une soirée d'échanges.\n\n${LUMA}`)
    expect(out.body).toBe("Une soirée d'échanges.")
  })

  it("n'affiche plus le gabarit sur la fiche publique", () => {
    const tx = eventText({ slug: "ed-2", source_title: "Ed. 2", source_description: LUMA, event_translations: [] }, "fr")
    expect(tx.description).toBeNull()
    expect(tx.summary).toBeNull()
  })
})
