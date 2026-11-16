import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { resolveAiConfig } from "@/lib/ai/providers"
import { mockDraft, draftSchema } from "@/lib/newsletter/compose"
import { runAllChecks, failedChecks } from "@/lib/newsletter/checks"
import type { EditionInputs } from "@/lib/newsletter/inputs"

describe("résolution du fournisseur IA", () => {
  const base = { enabled: true, apiKey: "test-key" }
  it("Anthropic : une clé suffit (URL et modèle par défaut)", () => {
    const c = resolveAiConfig({ ...base, provider: "anthropic" })
    expect(c.ready).toBe(true)
    expect(c.baseUrl).toBe("https://api.anthropic.com")
    expect(c.model).toBe("claude-sonnet-5-5")
  })
  it("OpenAI et Mistral : URL connue, modèle obligatoire (jamais deviné)", () => {
    expect(resolveAiConfig({ ...base, provider: "openai" }).problems).toContain("AI_MODEL manquant")
    const o = resolveAiConfig({ ...base, provider: "openai", model: "un-modele" })
    expect(o.ready).toBe(true)
    expect(o.baseUrl).toBe("https://api.openai.com/v1")
    expect(o.maxTokensParam).toBe("max_completion_tokens")
    expect(resolveAiConfig({ ...base, provider: "mistral", model: "m" }).baseUrl).toBe("https://api.mistral.ai/v1")
  })
  it("compatible OpenAI : URL https obligatoire", () => {
    expect(resolveAiConfig({ ...base, provider: "openai-compatible", model: "m" }).problems).toContain("AI_BASE_URL manquant")
    expect(resolveAiConfig({ ...base, provider: "openai-compatible", model: "m", baseUrl: "http://x.example" }).problems).toContain("AI_BASE_URL doit être en https")
  })
  it("refuse sans interrupteur, sans clé ou fournisseur inconnu", () => {
    expect(resolveAiConfig({ ...base, enabled: false, provider: "anthropic" }).ready).toBe(false)
    expect(resolveAiConfig({ enabled: true, provider: "anthropic" }).problems).toContain("AI_API_KEY manquant")
    expect(resolveAiConfig({ ...base, provider: "gpt" }).problems[0]).toMatch(/inconnu/)
  })
  it("simulation : sans clé hors production, interdite en production", () => {
    expect(resolveAiConfig({ enabled: true, provider: "mock", deployment: "preview" }).ready).toBe(true)
    expect(resolveAiConfig({ enabled: true, provider: "mock", deployment: "production" }).ready).toBe(false)
  })
})

describe("moteur IA (fetch simulé, aucun appel réseau)", () => {
  const schema = z.object({ status: z.literal("ok") })
  let fetchMock: ReturnType<typeof vi.fn>

  async function engineWith(envVars: Record<string, string>) {
    vi.resetModules()
    for (const [k, v] of Object.entries(envVars)) vi.stubEnv(k, v)
    return import("@/lib/ai/engine")
  }
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } })

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("Anthropic : en-têtes, modèle par défaut, sortie validée", async () => {
    const { generateStructured, newBudget } = await engineWith({ FEATURE_AI: "true", AI_PROVIDER: "anthropic", AI_API_KEY: "k" })
    fetchMock.mockResolvedValue(json({ content: [{ type: "text", text: '{"status":"ok"}' }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 3 } }))
    const budget = newBudget()
    const { value } = await generateStructured({ purpose: "healthcheck", system: "s", user: "u", schema, budget })
    expect(value).toEqual({ status: "ok" })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.anthropic.com/v1/messages")
    expect(init.headers["x-api-key"]).toBe("k")
    expect(JSON.parse(init.body).model).toBe("claude-sonnet-5-5")
    expect(budget.remainingCalls).toBe(3)
    expect(budget.remainingTokens).toBe(60000 - 8)
  })

  it("OpenAI : chat completions, mode JSON, paramètre de jetons adapté", async () => {
    const { generateStructured, newBudget } = await engineWith({ FEATURE_AI: "true", AI_PROVIDER: "openai", AI_API_KEY: "k", AI_MODEL: "mon-modele" })
    fetchMock.mockResolvedValue(json({ choices: [{ message: { content: '{"status":"ok"}' }, finish_reason: "stop" }] }))
    await generateStructured({ purpose: "healthcheck", system: "s", user: "u", schema, budget: newBudget() })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.openai.com/v1/chat/completions")
    const body = JSON.parse(init.body)
    expect(body.response_format).toEqual({ type: "json_object" })
    expect(body.max_completion_tokens).toBe(4000)
    expect(init.headers.authorization).toBe("Bearer k")
  })

  it("429 : un seul nouvel essai, puis succès", async () => {
    const { generateStructured, newBudget } = await engineWith({ FEATURE_AI: "true", AI_PROVIDER: "anthropic", AI_API_KEY: "k" })
    vi.useFakeTimers()
    fetchMock
      .mockResolvedValueOnce(json({}, 429, { "retry-after": "1" }))
      .mockResolvedValueOnce(json({ content: [{ type: "text", text: '{"status":"ok"}' }] }))
    const p = generateStructured({ purpose: "healthcheck", system: "s", user: "u", schema, budget: newBudget() })
    await vi.advanceTimersByTimeAsync(1500)
    await expect(p).resolves.toMatchObject({ value: { status: "ok" } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it("erreur 401 : aucun nouvel essai", async () => {
    const { generateStructured, newBudget } = await engineWith({ FEATURE_AI: "true", AI_PROVIDER: "anthropic", AI_API_KEY: "k" })
    fetchMock.mockResolvedValue(json({}, 401))
    await expect(generateStructured({ purpose: "healthcheck", system: "s", user: "u", schema, budget: newBudget() })).rejects.toThrow(/401/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("réponse tronquée refusée", async () => {
    const { generateStructured, newBudget, AiOutputError } = await engineWith({ FEATURE_AI: "true", AI_PROVIDER: "anthropic", AI_API_KEY: "k" })
    fetchMock.mockResolvedValue(json({ content: [{ type: "text", text: '{"status":"ok"}' }], stop_reason: "max_tokens" }))
    await expect(generateStructured({ purpose: "healthcheck", system: "s", user: "u", schema, budget: newBudget() })).rejects.toBeInstanceOf(AiOutputError)
  })

  it("budget épuisé : aucun appel", async () => {
    const { generateStructured, AiBudgetError } = await engineWith({ FEATURE_AI: "true", AI_PROVIDER: "anthropic", AI_API_KEY: "k" })
    await expect(generateStructured({ purpose: "healthcheck", system: "s", user: "u", schema, budget: { remainingCalls: 0 } })).rejects.toBeInstanceOf(AiBudgetError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("désactivé par défaut : aucun appel", async () => {
    const { generateStructured, newBudget, AiDisabledError } = await engineWith({ AI_PROVIDER: "anthropic", AI_API_KEY: "k" })
    await expect(generateStructured({ purpose: "healthcheck", system: "s", user: "u", schema, budget: newBudget() })).rejects.toBeInstanceOf(AiDisabledError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("simulation : réponse fournie sans réseau", async () => {
    const { generateStructured, newBudget } = await engineWith({ FEATURE_AI: "true", AI_PROVIDER: "mock", VERCEL_ENV: "preview" })
    const { value } = await generateStructured({ purpose: "healthcheck", system: "s", user: "u", schema, budget: newBudget(), mock: () => ({ status: "ok" }) })
    expect(value.status).toBe("ok")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("brouillon simulé de newsletter", () => {
  const inputs: EditionInputs = {
    facts: [{ key: "devs_active_28d", label: { fr: "développeurs actifs", en: "active developers" }, value: 1234, previous: null, asOf: "2026-11-01" }],
    sob: { versionId: "v", asOf: "2026-11-01", source: "Electric Capital", license: "CC BY 4.0" },
    news: [{ id: "n1", title: "Kenya adopts a sandbox", summary: null, url: "https://example.org/n1", sourceName: "Example News", sourceTerms: "ok", publishedAt: null, theme: "regulation" } as EditionInputs["news"][number]],
    events: [{ id: "e1", startsAt: "2026-12-01T23:00:00Z", timeZone: "America/Toronto", city: "Toronto", mode: "in_person", title: { fr: "Rencontre", en: "Meetup" }, url: { fr: "/fr/evenements/x", en: "/evenements/x" }, lumaUrl: null } as EditionInputs["events"][number]],
    stories: [],
  }
  it("respecte le schéma et passe les contrôles bloquants hors LLM", () => {
    const draft = mockDraft(inputs)
    expect(draftSchema.safeParse(draft).success).toBe(true)
    const checks = runAllChecks(draft, inputs, "2026-11-18T14:00:00.000Z")
    expect(failedChecks([...checks.fr, ...checks.en, ...checks.pair]).map((c) => c.key)).toEqual([])
    expect(draft.fr.subject).toMatch(/^\[Simulation\]/)
  })
})
