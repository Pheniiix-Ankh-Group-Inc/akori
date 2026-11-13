import "server-only"
import { z } from "zod"
import { generateStructured, type AiBudget } from "@/lib/ai/engine"
import type { EditionInputs } from "./inputs"

/**
 * Rédaction par le moteur IA commun. Le modèle reçoit UNIQUEMENT les données
 * d'entrée et doit :
 *  - référencer les éléments par leur identifiant (aucune source inventée) ;
 *  - n'écrire aucun chiffre lui-même : les indicateurs sont insérés par le
 *    code via des marqueurs {{fact:clé}} ;
 *  - produire FR et EN dans la même réponse, avec les mêmes éléments.
 */

const blurb = z.string().trim().min(1).max(400)

const localeDraft = z.object({
  subject: z.string().trim().min(5).max(120),
  preheader: z.string().trim().max(200),
  intro: z.string().trim().max(600),
  blockchain_insights: z.object({ text: z.string().trim().max(900) }),
  blockchain_news: z.array(z.object({ news_id: z.string(), blurb })).max(6),
  bib_events: z.array(z.object({ event_id: z.string(), blurb })).max(5),
  bib_highlights: z.array(z.object({ story_id: z.string(), blurb })).max(4),
})

export const draftSchema = z.object({ fr: localeDraft, en: localeDraft })
export type EditionDraft = z.infer<typeof draftSchema>
export type LocaleDraft = z.infer<typeof localeDraft>

const SYSTEM = `Tu rédiges la newsletter hebdomadaire de Black in Blockchain (BIB), une communauté autour de l'écosystème blockchain.
Règles impératives :
1. Quatre rubriques exactes et dans cet ordre : Blockchain Insights, Blockchain News, BIB Events, BIB Highlights. N'en ajoute aucune.
2. Thèmes couverts : innovation, adoption et cas d'usage, entrepreneuriat et écosystèmes, talents, éducation, réglementation. Aucun conseil d'investissement, de trading ou de spéculation.
3. Priorité éditoriale : Afrique, Caraïbes et diasporas, sans négliger les évolutions mondiales. Ne déduis jamais l'appartenance à une diaspora d'un nom ou d'une apparence.
4. N'utilise QUE les éléments fournis, référencés par leur identifiant exact. N'invente aucun fait, aucune source, aucune citation, aucun événement.
5. N'écris AUCUN chiffre toi-même. Pour un indicateur State of BIB, écris le marqueur {{fact:CLÉ}} (CLÉ parmi celles fournies) ; le code insère la valeur. Dans les autres textes, ne recopie un nombre que s'il figure dans le titre ou le résumé de l'élément cité.
6. Les statistiques State of BIB portent sur l'Afrique et les Caraïbes : ne les présente jamais comme une mesure de la diaspora.
7. Produis une version française (fr) et une version anglaise (en) qui couvrent EXACTEMENT les mêmes éléments, chacune rédigée naturellement dans sa langue.
8. Une rubrique sans élément fourni reste vide (tableau vide ou texte vide).
Réponds uniquement par un objet JSON conforme au format demandé.`

function payload(inputs: EditionInputs) {
  return {
    facts: inputs.facts.map((f) => ({ key: f.key, label_fr: f.label.fr, label_en: f.label.en, has_previous: f.previous !== null, as_of: f.asOf })),
    news: inputs.news.map((n) => ({ id: n.id, title: n.title, summary: n.summary, source: n.sourceName, theme: n.theme, regions: n.regions })),
    events: inputs.events.map((e) => ({ id: e.id, title_fr: e.title.fr, title_en: e.title.en, city: e.city, mode: e.mode })),
    highlights: inputs.stories.map((s) => ({ id: s.id, title_fr: s.title.fr, title_en: s.title.en, summary_fr: s.summary.fr, summary_en: s.summary.en })),
  }
}

const FORMAT = `Format JSON attendu :
{"fr": {"subject": "...", "preheader": "...", "intro": "...",
        "blockchain_insights": {"text": "... {{fact:devs_active_28d}} ..."},
        "blockchain_news": [{"news_id": "<id>", "blurb": "..."}],
        "bib_events": [{"event_id": "<id>", "blurb": "..."}],
        "bib_highlights": [{"story_id": "<id>", "blurb": "..."}]},
 "en": { ...même structure... }}`

export async function draftEdition(inputs: EditionInputs, budget: AiBudget, feedback?: string[]) {
  const user = [
    "Données disponibles pour cette édition (JSON) :",
    JSON.stringify(payload(inputs)),
    FORMAT,
    feedback?.length ? `La version précédente a échoué aux contrôles suivants ; corrige-les :\n- ${feedback.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
  return generateStructured({
    purpose: feedback?.length ? "newsletter_regen" : "newsletter_draft",
    system: SYSTEM,
    user,
    schema: draftSchema,
    budget,
  })
}
