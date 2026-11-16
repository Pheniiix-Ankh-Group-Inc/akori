/**
 * Formulaire d'édition humaine de la newsletter (pur, testé unitairement).
 * Une même liste d'éléments par rubrique pour FR et EN (parité imposée par
 * construction), avec position, retrait et ajout d'un élément disponible.
 */
import type { EditionDraft, LocaleDraft } from "./compose"

export const RUBRICS = [
  { key: "blockchain_news", idField: "news_id", label: "Blockchain News", max: 6 },
  { key: "bib_events", idField: "event_id", label: "BIB Events", max: 5 },
  { key: "bib_highlights", idField: "story_id", label: "BIB Highlights", max: 4 },
] as const

export type RubricKey = (typeof RUBRICS)[number]["key"]

export interface HumanItem {
  id: string
  blurb: { fr: string; en: string }
}

const str = (fd: FormData, k: string) => {
  const v = fd.get(k)
  return typeof v === "string" ? v.trim() : ""
}

/** Éléments d'une rubrique, dans l'ordre FR (référence de parité). */
export function itemsOf(draft: EditionDraft | null, key: RubricKey): HumanItem[] {
  if (!draft) return []
  const idField = RUBRICS.find((r) => r.key === key)!.idField
  const fr = draft.fr[key] as Record<string, string>[]
  const en = draft.en[key] as Record<string, string>[]
  return fr.map((it) => ({ id: it[idField], blurb: { fr: it.blurb, en: en.find((e) => e[idField] === it[idField])?.blurb ?? "" } }))
}

export function parseHumanDraft(fd: FormData): { draft: EditionDraft; issues: string[] } {
  const issues: string[] = []
  const base = (l: "fr" | "en"): Omit<LocaleDraft, RubricKey> => ({
    subject: str(fd, `subject_${l}`),
    preheader: str(fd, `preheader_${l}`),
    intro: str(fd, `intro_${l}`),
    blockchain_insights: { text: str(fd, `insights_${l}`) },
  })
  const fr = { ...base("fr") } as LocaleDraft
  const en = { ...base("en") } as LocaleDraft

  for (const r of RUBRICS) {
    const n = Math.min(Number.parseInt(str(fd, `${r.key}_n`) || "0", 10) || 0, 50)
    const rows: { id: string; pos: number; fr: string; en: string }[] = []
    for (let i = 0; i < n; i++) {
      const id = str(fd, `${r.key}_id_${i}`)
      if (!id || fd.get(`${r.key}_rm_${i}`) === "on") continue
      const pos = Number.parseFloat(str(fd, `${r.key}_pos_${i}`))
      rows.push({ id, pos: Number.isFinite(pos) ? pos : i + 1, fr: str(fd, `${r.key}_fr_${i}`), en: str(fd, `${r.key}_en_${i}`) })
    }
    const addId = str(fd, `${r.key}_id_new`)
    if (addId) rows.push({ id: addId, pos: Number.POSITIVE_INFINITY, fr: str(fd, `${r.key}_fr_new`), en: str(fd, `${r.key}_en_new`) })
    const seen = new Set<string>()
    const ordered = rows
      .map((row, i) => ({ ...row, i }))
      .sort((a, b) => a.pos - b.pos || a.i - b.i)
      .filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)))
    if (ordered.length > r.max) issues.push(`${r.label} : ${r.max} éléments au maximum.`)
    for (const row of ordered) if (!row.fr || !row.en) issues.push(`${r.label} : texte FR et EN requis pour chaque élément.`)
    ;(fr as Record<string, unknown>)[r.key] = ordered.map((row) => ({ [r.idField]: row.id, blurb: row.fr }))
    ;(en as Record<string, unknown>)[r.key] = ordered.map((row) => ({ [r.idField]: row.id, blurb: row.en }))
  }
  return { draft: { fr, en }, issues: [...new Set(issues)] }
}

/** Brouillon vide (cycle créé à la main, avant toute rédaction). */
export function emptyDraft(): EditionDraft {
  const l = (): LocaleDraft => ({ subject: "", preheader: "", intro: "", blockchain_insights: { text: "" }, blockchain_news: [], bib_events: [], bib_highlights: [] })
  return { fr: l(), en: l() }
}
