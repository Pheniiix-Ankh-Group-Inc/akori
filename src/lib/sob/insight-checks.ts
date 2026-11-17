import { mentionsSobProvider } from "@/lib/sob/public-text"

export type Direction = "up" | "down" | "flat" | "no_previous"

const UP = /\b(hausse|augment\w*|progress\w*|croissance|cro[iî]t|bond\w*|grimp\w*|gagne\w*|growth|grow\w*|increas\w*|rise[sn]?|rising|rose|gain\w*|surge\w*|climb\w*|aument\w*|crec\w*|sub[eií]\w*|alza)\b/i
const DOWN = /\b(baisse\w*|recul\w*|diminu\w*|chute\w*|d[ée]clin\w*|perd\w*|decreas\w*|declin\w*|drop\w*|fall\w*|fell|shr[iu]nk\w*|loss|lost|disminu\w*|descen\w*|baj[aóo]\w*|ca[ií]da|retroce\w*)\b/i
const OUT_OF_SCOPE = /\b(europe\w*|asia\w*|asie|asiatique\w*|north america\w*|am[ée]rique du nord|latin america\w*|am[ée]rique latine|united states|[ée]tats-unis|estados unidos|china|chine|india|inde|worldwide|dans le monde entier|en todo el mundo)\b/i
const NEGATION = /\b(ne|n'|n’|pas|not|no|sans|without|sin|aucun\w*|never|jamais|nunca|doesn't|don't|isn't|aren't)\b/i

/**
 * Contrôles éditoriaux automatiques d'une analyse State of BIB (hors modèle) :
 *  · aucun chiffre libre : seuls les marqueurs {{fact:CLÉ}} connus portent des valeurs ;
 *  · tendance cohérente avec l'évolution réelle des développeurs actifs ;
 *  · périmètre Afrique/Caraïbes : aucune autre région, la diaspora n'est pas
 *    présentée comme mesurée ;
 *  · fournisseurs et licences absents (page légale uniquement).
 * Renvoie la liste des refus ; vide si l'analyse est publiable.
 */
export function insightProblems(parts: { title: string; body: string; limitations: string }, factKeys: string[], direction: Direction): string[] {
  const out: string[] = []
  const text = `${parts.title} ${parts.body} ${parts.limitations}`
  if (!parts.title.trim() || parts.body.trim().length < 40) out.push("analyse vide ou trop courte")
  const markers = [...text.matchAll(/\{\{fact:([a-z0-9_]+)\}\}/g)].map((m) => m[1])
  if (markers.some((m) => !factKeys.includes(m))) out.push("marqueur d'indicateur inconnu")
  if (!markers.length) out.push("aucun indicateur vérifiable cité")
  if (/\d/.test(text.replace(/\{\{fact:[a-z0-9_]+\}\}/g, ""))) out.push("chiffre non issu des données")
  if (mentionsSobProvider(text)) out.push("mention d'un fournisseur ou d'une licence hors page légale")

  // Tendance : jugée sur le titre et le corps (les limites sont descriptives).
  const claim = `${parts.title} ${parts.body}`.replace(/\{\{fact:[a-z0-9_]+\}\}/g, " ")
  const up = UP.test(claim)
  const down = DOWN.test(claim)
  if (direction === "no_previous" && (up || down)) out.push("tendance affirmée sans version précédente à comparer")
  if (direction === "up" && down && !up) out.push("baisse affirmée alors que l'indicateur principal progresse")
  if (direction === "down" && up && !down) out.push("hausse affirmée alors que l'indicateur principal recule")
  if (direction === "flat" && (up || down) && !(up && down)) out.push("tendance affirmée alors que l'indicateur principal est stable")

  if (OUT_OF_SCOPE.test(text)) out.push("région hors périmètre Afrique/Caraïbes")
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (/diaspora/i.test(sentence) && !NEGATION.test(sentence)) out.push("la diaspora est présentée comme mesurée")
  }
  return [...new Set(out)]
}
