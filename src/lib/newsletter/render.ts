import type { NewsletterLocale } from "@/lib/brevo"
import { formatEventDate } from "@/lib/events/temporal"
import { intlLocale } from "@/lib/content/locales"
import type { EditionInputs } from "./inputs"
import { localizedTitle } from "./inputs"
import type { LocaleDraft } from "./compose"

export const RUBRIC_TITLES = {
  blockchain_insights: "Blockchain Insights",
  blockchain_news: "Blockchain News",
  bib_events: "BIB Events",
  bib_highlights: "BIB Highlights",
} as const

const T = {
  fr: {
    noEvents: "Aucun événement BIB n'est annoncé pour les prochaines semaines.",
    noHighlights: "Aucune nouvelle rétrospective cette semaine.",
    noNews: "Aucune actualité retenue cette semaine.",
    noInsights: "Aucune nouvelle donnée State of BIB cette semaine.",
    register: "S'inscrire sur Luma",
    details: "Voir la fiche",
    read: "Lire",
    source: "Source",
    sobNote: (asOf: string, source: string, license: string) =>
      `Données State of BIB au ${asOf} · ${source} (${license}) · périmètre Afrique et Caraïbes.`,
    unsubscribe: "Se désabonner",
    why: "Vous recevez cet e-mail car vous avez confirmé votre inscription à la newsletter Black in Blockchain.",
  },
  en: {
    noEvents: "No BIB event has been announced for the coming weeks.",
    noHighlights: "No new retrospective this week.",
    noNews: "No news selected this week.",
    noInsights: "No new State of BIB data this week.",
    register: "Register on Luma",
    details: "View event",
    read: "Read",
    source: "Source",
    sobNote: (asOf: string, source: string, license: string) =>
      `State of BIB data as of ${asOf} · ${source} (${license}) · Africa and Caribbean scope.`,
    unsubscribe: "Unsubscribe",
    why: "You are receiving this email because you confirmed your subscription to the Black in Blockchain newsletter.",
  },
} as const

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

/** Remplace les marqueurs {{fact:clé}} par les valeurs calculées (format local). */
export function fillFacts(text: string, inputs: EditionInputs, locale: NewsletterLocale): string {
  const nf = new Intl.NumberFormat(intlLocale(locale))
  return text.replace(/\{\{fact:([a-z0-9_]+)\}\}/g, (_, key: string) => {
    const f = inputs.facts.find((x) => x.key === key)
    return f ? nf.format(f.value) : "{{fact:unknown}}"
  })
}

const link = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="color:#8a6a2f;text-decoration:underline">${escapeHtml(label)}</a>`

const section = (title: string, body: string) =>
  `<tr><td style="padding:24px 0 8px;border-top:1px solid #e4dfd6"><h2 style="margin:0 0 12px;font:600 18px Georgia,serif;color:#141414">${escapeHtml(title)}</h2>${body}</td></tr>`

const para = (text: string) => `<p style="margin:0 0 12px;font:400 15px/1.6 Arial,sans-serif;color:#3d3a35">${text}</p>`

/** HTML de l'édition. Tout texte injecté est échappé ; les liens viennent des données. */
export function renderEdition(draft: LocaleDraft, inputs: EditionInputs, locale: NewsletterLocale): { html: string; links: string[] } {
  const t = T[locale]
  const links: string[] = []
  const track = (href: string) => {
    links.push(href)
    return href
  }

  const insights = draft.blockchain_insights.text
    ? para(escapeHtml(fillFacts(draft.blockchain_insights.text, inputs, locale)))
    : para(escapeHtml(t.noInsights))
  const sobNote = inputs.sob.asOf ? `<p style="margin:0;font:400 12px Arial,sans-serif;color:#6b665e">${escapeHtml(t.sobNote(inputs.sob.asOf, inputs.sob.source, inputs.sob.license))}</p>` : ""

  const news = draft.blockchain_news.length
    ? draft.blockchain_news
        .map((n) => {
          const item = inputs.news.find((x) => x.id === n.news_id)
          if (!item) return ""
          return para(`<strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(n.blurb)}<br><span style="font-size:12px">${t.source} : ${escapeHtml(item.sourceName)} · ${link(track(item.url), t.read)}</span>`)
        })
        .join("")
    : para(escapeHtml(t.noNews))

  const events = draft.bib_events.length
    ? draft.bib_events
        .map((e) => {
          const ev = inputs.events.find((x) => x.id === e.event_id)
          if (!ev) return ""
          const title = localizedTitle(ev.title, locale) ?? ""
          const when = formatEventDate(ev.startsAt, ev.timeZone, intlLocale(locale))
          const cta = ev.lumaUrl ? link(track(ev.lumaUrl), t.register) : link(track(ev.url[locale]), t.details)
          return para(`<strong>${escapeHtml(title)}</strong><br>${escapeHtml(when)}${ev.city ? ` · ${escapeHtml(ev.city)}` : ""}<br>${escapeHtml(e.blurb)}<br>${cta}`)
        })
        .join("")
    : para(escapeHtml(t.noEvents))

  const highlights = draft.bib_highlights.length
    ? draft.bib_highlights
        .map((h) => {
          const st = inputs.stories.find((x) => x.id === h.story_id)
          if (!st) return ""
          const title = localizedTitle(st.title, locale) ?? ""
          return para(`<strong>${escapeHtml(title)}</strong><br>${escapeHtml(h.blurb)}<br>${link(track(st.url[locale]), t.read)}`)
        })
        .join("")
    : para(escapeHtml(t.noHighlights))

  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(draft.subject)}</title></head>
<body style="margin:0;background:#faf8f4">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(draft.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:32px 24px">
<tr><td><p style="margin:0 0 4px;font:600 13px Arial,sans-serif;color:#8a6a2f">Black in Blockchain</p><h1 style="margin:0 0 16px;font:400 28px Georgia,serif;color:#141414">${escapeHtml(draft.subject)}</h1>${draft.intro ? para(escapeHtml(draft.intro)) : ""}</td></tr>
${section(RUBRIC_TITLES.blockchain_insights, insights + sobNote)}
${section(RUBRIC_TITLES.blockchain_news, news)}
${section(RUBRIC_TITLES.bib_events, events)}
${section(RUBRIC_TITLES.bib_highlights, highlights)}
<tr><td style="padding:24px 0 0;border-top:1px solid #e4dfd6;font:400 12px Arial,sans-serif;color:#6b665e">${escapeHtml(t.why)}<br><a href="{{ unsubscribe }}" style="color:#6b665e">${t.unsubscribe}</a></td></tr>
</table></body></html>`

  return { html, links }
}
