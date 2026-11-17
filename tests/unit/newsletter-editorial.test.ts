import { beforeEach, describe, expect, it, vi } from "vitest"
import { FakeDb } from "./helpers/fake-supabase"

const db = new FakeDb()
const brevo = {
  createCampaign: vi.fn(async () => 101),
  sendCampaignNow: vi.fn(async () => {}),
  findCampaignByName: vi.fn(async () => null),
}

vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => db }))
vi.mock("@/lib/ops/incidents", () => ({ recordIncident: vi.fn(async () => {}) }))
vi.mock("@/lib/brevo", () => ({
  createCampaign: (...a: unknown[]) => brevo.createCampaign(...(a as [])),
  sendCampaignNow: (...a: unknown[]) => brevo.sendCampaignNow(...(a as [])),
  findCampaignByName: (...a: unknown[]) => brevo.findCampaignByName(...(a as [])),
  listIdFor: () => 1,
}))
const cfg = { autosend: true, brevo: true }
vi.mock("@/lib/env", () => ({
  env: { siteUrl: "https://example.test", flags: { get newsletterAutosend() { return cfg.autosend } }, newsletter: { maxRegenerations: 0 }, ai: { maxCallsPerRun: 1, maxTokensPerRun: 1 } },
  isAiConfigured: () => false,
  isBrevoConfigured: () => cfg.brevo,
}))
vi.mock("@/lib/ai/engine", () => ({
  AiBudgetError: class extends Error {},
  AiDisabledError: class extends Error {},
  newBudget: () => ({}),
  generateStructured: vi.fn(),
}))
vi.mock("@/lib/newsletter/inputs", async (orig) => ({
  ...(await orig<typeof import("@/lib/newsletter/inputs")>()),
  gatherInputs: async () => ({
    facts: [],
    sob: { versionId: null, asOf: null, source: "", license: "" },
    news: [{ id: "n1", title: "Adoption au Ghana", summary: null, url: "https://news.example/a", sourceName: "Exemple", sourceTerms: "CC BY", publishedAt: null, theme: null, regions: [] }],
    events: [],
    stories: [],
  }),
}))

const orch = await import("@/lib/newsletter/orchestrator")
const { parseHumanDraft, emptyDraft } = await import("@/lib/newsletter/human")

const WEEK = "2027-01-04" // lundi
const SLOT = "2027-01-06T14:00:00.000Z" // mercredi 09:00 Toronto (EST)
const inWindow = new Date("2027-01-06T14:10:00Z")

function draft() {
  const d = emptyDraft()
  d.fr.subject = "Nouvelles de la semaine"
  d.en.subject = "News of the week"
  d.fr.intro = "Bonjour à toutes et à tous, voici les nouvelles de la communauté et les projets de la semaine."
  d.en.intro = "Hello everyone, here is the news from the community and the projects of the week."
  d.fr.blockchain_insights.text = "Les équipes de la communauté poursuivent leurs projets et partagent leurs apprentissages."
  d.en.blockchain_insights.text = "The community teams continue their projects and share what they are learning."
  d.fr.blockchain_news = [{ news_id: "n1", blurb: "Une initiative pour les écoles et les développeurs de la région." }]
  d.en.blockchain_news = [{ news_id: "n1", blurb: "An initiative for schools and developers in the region." }]
  return d
}

async function eligibleCycle(mode: "auto" | "review" | "paused") {
  db.tables = {}
  db.rpcs = {
    newsletter_validate_pair: ({ p_cycle_id, p_edition_ids }) => {
      for (const e of db.table("newsletter_editions")) {
        if (e.cycle_id !== p_cycle_id) continue
        e.status = (p_edition_ids as string[]).includes(e.id as string) ? "validated" : e.status === "sent" ? "sent" : "cancelled"
      }
      return null
    },
  }
  db.table("automation_settings").push({ module: "newsletter", mode })
  const cycle = await orch.createManualCycle(WEEK, "editor-1")
  const res = await orch.saveHumanPair(cycle.id, draft(), "editor-1")
  expect(res.failed.map((f) => f.key)).toEqual([])
  return db.table("newsletter_cycles")[0] as { id: string; status: string; approved_at?: string | null; send_slot: string }
}

// L'orchestrateur revérifie la fenêtre avec l'horloge réelle : on la fige.
const at = (d: Date) => vi.useFakeTimers({ toFake: ["Date"] }).setSystemTime(d)

beforeEach(() => {
  vi.useRealTimers()
  cfg.autosend = true
  cfg.brevo = true
  brevo.createCampaign.mockReset().mockImplementation(async () => 101)
  brevo.sendCampaignNow.mockReset().mockImplementation(async () => {})
  brevo.findCampaignByName.mockReset().mockImplementation(async () => null)
})

describe("newsletter — édition humaine et modes", () => {
  it("une paire éditée par l'équipe passe les contrôles et devient éligible (version humaine tracée)", async () => {
    const c = await eligibleCycle("auto")
    expect(c.status).toBe("eligible")
    expect(c.send_slot).toBe(SLOT)
    const eds = db.table("newsletter_editions")
    expect(eds).toHaveLength(2)
    expect(eds.every((e) => e.origin === "human" && e.edited_by === "editor-1" && e.status === "validated")).toBe(true)
  })

  it("mode auto : envoi des deux langues au créneau, puis aucun double envoi", async () => {
    await eligibleCycle("auto")
    at(inWindow)
    const first = await orch.runSend(inWindow)
    expect(first.status).toBe("sent")
    expect(brevo.createCampaign).toHaveBeenCalledTimes(2)
    const again = await orch.runSend(inWindow)
    expect(again.detail).toBe("déjà traité")
    expect(brevo.createCampaign).toHaveBeenCalledTimes(2)
    expect(brevo.sendCampaignNow).toHaveBeenCalledTimes(2)
  })

  it("mode revue : sans approbation, la semaine est annulée et rien n'est envoyé", async () => {
    await eligibleCycle("review")
    const r = await orch.runSend(inWindow)
    expect(r.status).toBe("cancelled")
    expect(brevo.createCampaign).not.toHaveBeenCalled()
  })

  it("mode revue : après approbation admin, l'envoi a lieu", async () => {
    const c = await eligibleCycle("review")
    at(new Date(Date.now() + 60000))
    await orch.approveCycle(c.id, "admin-1")
    at(inWindow)
    const r = await orch.runSend(inWindow)
    expect(r.status).toBe("sent")
  })

  it("une nouvelle version annule l'approbation précédente", async () => {
    const c = await eligibleCycle("review")
    await orch.approveCycle(c.id, "admin-1")
    await orch.saveHumanPair(c.id, draft(), "editor-2")
    expect(db.table("newsletter_cycles")[0].approved_at).toBeNull()
  })

  it("mode pause : aucun envoi, cycle intact", async () => {
    await eligibleCycle("paused")
    const r = await orch.runSend(inWindow)
    expect(r.detail).toContain("pause")
    expect(db.table("newsletter_cycles")[0].status).toBe("eligible")
    expect(brevo.createCampaign).not.toHaveBeenCalled()
  })

  it("planification : créneau futur dans la semaine du cycle uniquement ; envoi au créneau planifié", async () => {
    const c = await eligibleCycle("auto")
    const now = new Date("2027-01-05T12:00:00Z")
    await expect(orch.scheduleCycle(c.id, "2027-01-05T11:00:00Z", now)).rejects.toThrow(/futur/)
    await expect(orch.scheduleCycle(c.id, "2027-02-01T11:00:00Z", now)).rejects.toThrow(/semaine/)
    await orch.scheduleCycle(c.id, "2027-01-07T15:00:00Z", now)
    expect((await orch.runSend(inWindow)).detail).toBe("créneau non atteint")
    at(new Date("2027-01-07T15:05:00Z"))
    expect((await orch.runSend(new Date("2027-01-07T15:05:00Z"))).status).toBe("sent")
  })

  it("rejet : la paire n'est plus envoyable", async () => {
    const c = await eligibleCycle("auto")
    await orch.rejectCycle(c.id, "ton à revoir")
    expect(db.table("newsletter_cycles")[0].status).toBe("blocked")
    const r = await orch.runSend(inWindow)
    expect(r.status).toBe("cancelled")
    expect(brevo.createCampaign).not.toHaveBeenCalled()
  })

  it("un cycle édité par l'équipe n'est pas réécrit par la génération IA du lundi", async () => {
    await eligibleCycle("auto")
    const r = await orch.runGenerate(new Date("2027-01-04T13:15:00Z"))
    expect(r.detail).toBe("cycle édité par l'équipe")
  })
})

describe("newsletter — envoi manuel indépendant de l'envoi automatique", () => {
  const cycleRow = () => db.table("newsletter_cycles")[0]

  it("autosend désactivé : l'envoi planifié ne part pas, l'envoi manuel part", async () => {
    cfg.autosend = false
    const c = await eligibleCycle("auto")
    const r = await orch.sendCycleNow(c.id)
    expect(r.status).toBe("sent")
    expect(brevo.createCampaign).toHaveBeenCalledTimes(2)
    expect(db.table("send_runs").map((x) => x.status)).toEqual(["sent", "sent"])
  })

  it("autosend désactivé : le cron du mercredi annule la semaine sans rien envoyer", async () => {
    cfg.autosend = false
    await eligibleCycle("auto")
    at(inWindow)
    const r = await orch.runSend(inWindow)
    expect(r).toMatchObject({ status: "cancelled", detail: "autosend_disabled" })
    expect(brevo.createCampaign).not.toHaveBeenCalled()
  })

  it("envoi manuel hors créneau du mercredi : possible (aucune dépendance à la fenêtre)", async () => {
    const c = await eligibleCycle("auto")
    at(new Date("2027-01-05T03:00:00Z"))
    expect((await orch.sendCycleNow(c.id)).status).toBe("sent")
  })

  it("mode revue : refus d'un envoi manuel non approuvé, édition intacte ; envoi après approbation", async () => {
    cfg.autosend = false
    const c = await eligibleCycle("review")
    await expect(orch.sendCycleNow(c.id)).rejects.toThrow(/approuvée/)
    expect(cycleRow().status).toBe("eligible")
    expect(brevo.createCampaign).not.toHaveBeenCalled()
    at(new Date(Date.now() + 60000))
    await orch.approveCycle(c.id, "admin-1")
    expect((await orch.sendCycleNow(c.id)).status).toBe("sent")
  })

  it("mode revue : une modification après approbation invalide l'approbation (envoi refusé)", async () => {
    const c = await eligibleCycle("review")
    at(new Date(Date.now() + 60000))
    await orch.approveCycle(c.id, "admin-1")
    at(new Date(Date.now() + 60000))
    await orch.saveHumanPair(c.id, draft(), "editor-2")
    await expect(orch.sendCycleNow(c.id)).rejects.toThrow(/approuvée/)
    expect(brevo.createCampaign).not.toHaveBeenCalled()
  })

  it("mode pause : aucun envoi manuel, édition intacte", async () => {
    const c = await eligibleCycle("paused")
    await expect(orch.sendCycleNow(c.id)).rejects.toThrow(/pause/)
    expect(cycleRow().status).toBe("eligible")
  })

  it("Brevo non configuré : refus sans annuler l'édition approuvée", async () => {
    const c = await eligibleCycle("auto")
    cfg.brevo = false
    await expect(orch.sendCycleNow(c.id)).rejects.toThrow(/Brevo non configuré/)
    expect(cycleRow().status).toBe("eligible")
    expect(cycleRow().cancelled_reason ?? null).toBeNull()
  })

  it("édition bloquée par les contrôles : envoi manuel refusé", async () => {
    const c = await eligibleCycle("auto")
    await orch.rejectCycle(c.id, "à revoir")
    await expect(orch.sendCycleNow(c.id)).rejects.toThrow(/validée/)
    expect(brevo.createCampaign).not.toHaveBeenCalled()
  })

  it("idempotence : un second envoi manuel est refusé, aucune campagne en double", async () => {
    const c = await eligibleCycle("auto")
    await orch.sendCycleNow(c.id)
    await expect(orch.sendCycleNow(c.id)).rejects.toThrow()
    expect(brevo.createCampaign).toHaveBeenCalledTimes(2)
    expect(brevo.sendCampaignNow).toHaveBeenCalledTimes(2)
  })

  it("réconciliation Brevo : une campagne déjà envoyée sous ce nom n'est pas recréée", async () => {
    const c = await eligibleCycle("auto")
    brevo.findCampaignByName.mockImplementation(async () => ({ id: 77, status: "sent" }) as never)
    expect((await orch.sendCycleNow(c.id)).status).toBe("sent")
    expect(brevo.createCampaign).not.toHaveBeenCalled()
    expect(brevo.sendCampaignNow).not.toHaveBeenCalled()
  })

  it("erreur réseau (résultat incertain) : statut « unknown », aucun renvoi automatique", async () => {
    const c = await eligibleCycle("auto")
    brevo.sendCampaignNow.mockImplementation(async () => { throw new Error("ETIMEDOUT") })
    const r = await orch.sendCycleNow(c.id)
    expect(r.status).toBe("failed")
    expect(db.table("send_runs")[0]).toMatchObject({ status: "unknown" })
    expect(brevo.sendCampaignNow).toHaveBeenCalledTimes(1)
    // Ni le cron ni un nouvel essai manuel ne renvoient.
    at(inWindow)
    expect((await orch.runSend(inWindow)).detail).toBe("déjà traité")
    await expect(orch.sendCycleNow(c.id)).rejects.toThrow()
    expect(brevo.sendCampaignNow).toHaveBeenCalledTimes(1)
  })

  it("envoi partiel : première langue envoyée, seconde en échec → signalé, pas de renvoi", async () => {
    const c = await eligibleCycle("auto")
    let n = 0
    brevo.sendCampaignNow.mockImplementation(async () => { if (++n === 2) throw new Error("HTTP 502") })
    const r = await orch.sendCycleNow(c.id)
    expect(r.status).toBe("partially_sent")
    expect(db.table("send_runs").map((x) => x.status).sort()).toEqual(["sent", "unknown"])
    expect(cycleRow().status).toBe("partially_sent")
  })
})

describe("formulaire d'édition humaine", () => {
  it("ordonne, retire, ajoute et impose la parité FR/EN", () => {
    const fd = new FormData()
    for (const [k, v] of Object.entries({
      subject_fr: "Objet", subject_en: "Subject", preheader_fr: "", preheader_en: "", intro_fr: "a", intro_en: "b", insights_fr: "", insights_en: "",
      blockchain_news_n: "3",
      blockchain_news_id_0: "n1", blockchain_news_pos_0: "2", blockchain_news_fr_0: "un", blockchain_news_en_0: "one",
      blockchain_news_id_1: "n2", blockchain_news_pos_1: "1", blockchain_news_fr_1: "deux", blockchain_news_en_1: "two",
      blockchain_news_id_2: "n3", blockchain_news_pos_2: "3", blockchain_news_rm_2: "on", blockchain_news_fr_2: "x", blockchain_news_en_2: "x",
      blockchain_news_id_new: "n4", blockchain_news_fr_new: "quatre", blockchain_news_en_new: "four",
      bib_events_n: "0", bib_highlights_n: "0",
    })) fd.set(k, v)
    const { draft: d, issues } = parseHumanDraft(fd)
    expect(issues).toEqual([])
    expect(d.fr.blockchain_news.map((n) => n.news_id)).toEqual(["n2", "n1", "n4"])
    expect(d.en.blockchain_news.map((n) => n.blurb)).toEqual(["two", "one", "four"])
  })

  it("signale un texte manquant et le dépassement du maximum", () => {
    const fd = new FormData()
    fd.set("bib_highlights_n", "5")
    for (let i = 0; i < 5; i++) {
      fd.set(`bib_highlights_id_${i}`, `s${i}`)
      fd.set(`bib_highlights_fr_${i}`, "fr")
      fd.set(`bib_highlights_en_${i}`, i === 0 ? "" : "en")
    }
    const { issues } = parseHumanDraft(fd)
    expect(issues.join(" ")).toMatch(/4 éléments au maximum/)
    expect(issues.join(" ")).toMatch(/FR et EN requis/)
  })
})
