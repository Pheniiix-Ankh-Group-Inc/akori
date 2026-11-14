import type { NewsletterLocale } from "@/lib/brevo"
import type { EditionInputs } from "./inputs"
import type { EditionDraft, LocaleDraft } from "./compose"
import { RUBRIC_TITLES } from "./render"

/**
 * Contrôles automatiques HORS LLM. Tous les contrôles listés ici sont
 * bloquants : une seule erreur dans une langue bloque les DEUX langues.
 */

export interface CheckResult {
  key: string
  blocking: boolean
  passed: boolean
  details: Record<string, unknown>
}

const EXCLUDED_TERMS = [
  "buy now", "achetez maintenant", "price target", "objectif de cours", "to the moon", "pump", "signal de trading",
  "trading signal", "conseil d'investissement", "investment advice", "guaranteed return", "rendement garanti", "100x",
]

const FR_MARKERS = [" le ", " la ", " les ", " des ", " et ", " du ", " une "]
const EN_MARKERS = [" the ", " and ", " of ", " to ", " for ", " with "]

function allText(d: LocaleDraft): string {
  return [
    d.subject,
    d.preheader,
    d.intro,
    d.blockchain_insights.text,
    ...d.blockchain_news.map((n) => n.blurb),
    ...d.bib_events.map((e) => e.blurb),
    ...d.bib_highlights.map((h) => h.blurb),
  ].join(" ")
}

const digitsIn = (s: string) => s.match(/\d[\d.,\s]*\d|\d/g)?.map((x) => x.replace(/[\s.,]/g, "")) ?? []

/** Formulations de conseil financier (FR/EN). */
export const FINANCIAL_ADVICE_PATTERNS: RegExp[] = [
  /\b(achetez|vendez|investissez|placez votre argent)\b/,
  /\b(buy now|you should buy|you should sell|sell now|invest now|price target|guaranteed (return|profit)s?)\b/,
  /\b(rendement garanti|profit garanti|objectif de cours|meilleur moment pour acheter)\b/,
  /\b(not financial advice|ceci n'est pas un conseil financier)\b/,
]

const ok = (key: string, details: Record<string, unknown> = {}): CheckResult => ({ key, blocking: true, passed: true, details })
const fail = (key: string, details: Record<string, unknown>): CheckResult => ({ key, blocking: true, passed: false, details })

function checkLocale(locale: NewsletterLocale, d: LocaleDraft, inputs: EditionInputs, sendSlotIso: string): CheckResult[] {
  const results: CheckResult[] = []
  const k = (name: string) => `${locale}.${name}`

  // Identifiants : uniquement des éléments fournis (aucune source inventée).
  const unknown = [
    ...d.blockchain_news.filter((n) => !inputs.news.some((x) => x.id === n.news_id)).map((n) => n.news_id),
    ...d.bib_events.filter((e) => !inputs.events.some((x) => x.id === e.event_id)).map((e) => e.event_id),
    ...d.bib_highlights.filter((h) => !inputs.stories.some((x) => x.id === h.story_id)).map((h) => h.story_id),
  ]
  results.push(unknown.length ? fail(k("sources_known"), { unknown }) : ok(k("sources_known")))

  // Doublons dans une rubrique.
  const dup = (ids: string[]) => ids.length !== new Set(ids).size
  const hasDup = dup(d.blockchain_news.map((n) => n.news_id)) || dup(d.bib_events.map((e) => e.event_id)) || dup(d.bib_highlights.map((h) => h.story_id))
  results.push(hasDup ? fail(k("no_duplicates"), {}) : ok(k("no_duplicates")))

  // Marqueurs d'indicateurs : seulement des clés existantes.
  const markers = [...d.blockchain_insights.text.matchAll(/\{\{fact:([a-z0-9_]+)\}\}/g)].map((m) => m[1])
  const badMarkers = markers.filter((m) => !inputs.facts.some((f) => f.key === m))
  results.push(badMarkers.length ? fail(k("fact_markers"), { badMarkers }) : ok(k("fact_markers"), { markers }))

  // Chiffres : l'IA n'en écrit aucun, sauf s'ils figurent dans l'élément cité.
  const insightDigits = digitsIn(d.blockchain_insights.text.replace(/\{\{fact:[a-z0-9_]+\}\}/g, ""))
  const strayDigits: string[] = [...insightDigits]
  for (const n of d.blockchain_news) {
    const item = inputs.news.find((x) => x.id === n.news_id)
    const allowed = new Set(digitsIn(`${item?.title ?? ""} ${item?.summary ?? ""}`))
    strayDigits.push(...digitsIn(n.blurb).filter((x) => !allowed.has(x)))
  }
  for (const e of d.bib_events) {
    const ev = inputs.events.find((x) => x.id === e.event_id)
    const allowed = new Set(digitsIn(`${ev?.title.fr ?? ""} ${ev?.title.en ?? ""}`))
    strayDigits.push(...digitsIn(e.blurb).filter((x) => !allowed.has(x)))
  }
  for (const h of d.bib_highlights) {
    const st = inputs.stories.find((x) => x.id === h.story_id)
    const allowed = new Set(digitsIn(`${st?.title.fr ?? ""} ${st?.title.en ?? ""} ${st?.summary.fr ?? ""} ${st?.summary.en ?? ""}`))
    strayDigits.push(...digitsIn(h.blurb).filter((x) => !allowed.has(x)))
  }
  strayDigits.push(...digitsIn(`${d.subject} ${d.preheader} ${d.intro}`))
  results.push(strayDigits.length ? fail(k("numbers_sourced"), { strayDigits: strayDigits.slice(0, 10) }) : ok(k("numbers_sourced")))

  // Événements toujours à venir au moment de l'envoi.
  const stale = d.bib_events
    .map((e) => inputs.events.find((x) => x.id === e.event_id))
    .filter((ev) => ev && Date.parse(ev.startsAt) <= Date.parse(sendSlotIso))
    .map((ev) => ev!.id)
  results.push(stale.length ? fail(k("event_dates"), { stale }) : ok(k("event_dates")))

  // Titres localisés disponibles pour les événements et rétrospectives cités.
  const untitled = [
    ...d.bib_events.filter((e) => !inputs.events.find((x) => x.id === e.event_id)?.title[locale]).map((e) => e.event_id),
    ...d.bib_highlights.filter((h) => !inputs.stories.find((x) => x.id === h.story_id)?.title[locale]).map((h) => h.story_id),
  ]
  results.push(untitled.length ? fail(k("translation_available"), { untitled }) : ok(k("translation_available")))

  // Licences et provenance des actualités.
  const unlicensed = d.blockchain_news
    .map((n) => inputs.news.find((x) => x.id === n.news_id))
    .filter((n) => n && (!n.sourceTerms?.trim() || !n.sourceName?.trim() || !/^https:\/\//.test(n.url)))
    .map((n) => n!.id)
  results.push(unlicensed.length ? fail(k("licenses_and_citations"), { unlicensed }) : ok(k("licenses_and_citations")))

  // Attribution State of BIB si des indicateurs sont cités.
  results.push(markers.length && !inputs.sob.asOf ? fail(k("sob_attribution"), {}) : ok(k("sob_attribution")))

  // Ligne éditoriale : pas de spéculation ni de conseil d'investissement.
  const text = ` ${allText(d).toLowerCase()} `
  const banned = EXCLUDED_TERMS.filter((w) => text.includes(w))
  results.push(banned.length ? fail(k("editorial_policy"), { banned }) : ok(k("editorial_policy")))

  // Conseil financier : formulations prescriptives (acheter, vendre, rendement
  // garanti…) refusées, en plus des termes exclus.
  const advice = FINANCIAL_ADVICE_PATTERNS.filter((re) => re.test(text)).map((re) => re.source)
  results.push(advice.length ? fail(k("no_financial_advice"), { advice }) : ok(k("no_financial_advice")))

  // Liens : aucun lien rédigé par le modèle ; les URL sont insérées par le
  // code à partir des identifiants (sources autorisées uniquement).
  const urls = allText(d).match(/\b(https?:\/\/|www\.)\S+/gi) ?? []
  results.push(urls.length ? fail(k("no_model_links"), { urls: urls.slice(0, 5) }) : ok(k("no_model_links")))

  // Langue attendue (heuristique simple, sans IA ; jamais une preuve
  // linguistique : un texte court peut être rejeté à tort).
  const markersOk = (locale === "fr" ? FR_MARKERS : EN_MARKERS).filter((m) => text.includes(m)).length >= 2
  const otherHits = (locale === "fr" ? EN_MARKERS : FR_MARKERS).filter((m) => text.includes(m)).length
  results.push(markersOk && otherHits <= 3 ? ok(k("language")) : fail(k("language"), { markersOk, otherHits }))

  // Contenu minimal : au moins deux rubriques non vides.
  const filled = [d.blockchain_insights.text.length > 0, d.blockchain_news.length > 0, d.bib_events.length > 0, d.bib_highlights.length > 0].filter(Boolean).length
  results.push(filled >= 2 ? ok(k("min_content"), { filled }) : fail(k("min_content"), { filled }))

  return results
}

/** Contrôles sur le HTML rendu (liens autorisés, désabonnement, rubriques). */
export function checkRendered(locale: NewsletterLocale, html: string, links: string[], inputs: EditionInputs, siteUrl: string): CheckResult[] {
  const allowed = new Set<string>([
    ...inputs.news.map((n) => n.url),
    ...inputs.events.flatMap((e) => [e.url.fr, e.url.en, e.lumaUrl ?? ""]),
    ...inputs.stories.flatMap((s) => [s.url.fr, s.url.en]),
  ])
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))
  const badLinks = hrefs.filter((h) => h !== "{{ unsubscribe }}" && !allowed.has(h) && !h.startsWith(siteUrl))
  const insecure = links.filter((l) => !l.startsWith("https://"))
  const rubricsInOrder = Object.values(RUBRIC_TITLES).every((title, i, arr) => {
    const pos = html.indexOf(`>${title}<`)
    return pos >= 0 && (i === 0 || pos > html.indexOf(`>${arr[i - 1]}<`))
  })
  return [
    badLinks.length || insecure.length ? fail(`${locale}.links`, { badLinks, insecure }) : ok(`${locale}.links`, { count: hrefs.length }),
    html.includes('href="{{ unsubscribe }}"') ? ok(`${locale}.unsubscribe`) : fail(`${locale}.unsubscribe`, {}),
    rubricsInOrder ? ok(`${locale}.rubrics`) : fail(`${locale}.rubrics`, {}),
  ]
}

/** Contrôles croisés FR/EN : mêmes éléments dans les deux langues. */
export function checkPair(draft: EditionDraft): CheckResult[] {
  const ids = (d: LocaleDraft) =>
    JSON.stringify([
      d.blockchain_news.map((n) => n.news_id).sort(),
      d.bib_events.map((e) => e.event_id).sort(),
      d.bib_highlights.map((h) => h.story_id).sort(),
      [...d.blockchain_insights.text.matchAll(/\{\{fact:([a-z0-9_]+)\}\}/g)].map((m) => m[1]).sort(),
    ])
  const same = ids(draft.fr) === ids(draft.en)
  return [same ? ok("pair.same_items") : fail("pair.same_items", {})]
}

export function runAllChecks(draft: EditionDraft, inputs: EditionInputs, sendSlotIso: string) {
  return {
    fr: checkLocale("fr", draft.fr, inputs, sendSlotIso),
    en: checkLocale("en", draft.en, inputs, sendSlotIso),
    pair: checkPair(draft),
  }
}

export const failedChecks = (results: CheckResult[]) => results.filter((r) => r.blocking && !r.passed)
