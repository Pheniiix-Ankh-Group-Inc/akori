/**
 * Visuels éditoriaux de la direction artistique « Premium Minimalism ».
 *
 * Ce sont des images générées qui montrent uniquement des lieux, des matières
 * et des paysages : jamais de personnes, et jamais présentées comme des
 * photos d'événements BIB (les rétrospectives et les portraits restent de
 * vraies photos aux droits approuvés).
 *
 * Un visuel n'est affiché que si `file` est renseigné : le fichier HD doit
 * d'abord être déposé dans `public/images/editorial/` (JPEG ou WebP, 2 400 px
 * de large pour les bandeaux, moins de 400 Ko). Tant que `file` vaut `null`,
 * la section s'affiche sans image.
 *
 * PROVISOIRE (23 novembre 2026) : les fichiers actuels sont les aperçus
 * extraits du canevas Claude Design (environ 200 px de large, issus de
 * Canva). Ils seront remplacés par les exports HD ; mettre alors à jour
 * `file`, `width` et `height`.
 */
export type VisualKey = "home" | "events" | "sob" | "newsletter" | "about"

export type Visual = {
  /** Chemin public, ex. "/images/editorial/home.jpg", ou null tant que le fichier HD n'est pas déposé. */
  file: string | null
  width: number
  height: number
  /** Clé du texte alternatif dans l'espace de messages « Visuals ». */
  alt: VisualKey
}

export const VISUALS: Record<VisualKey, Visual> = {
  home: { file: "/images/editorial/home.jpg", width: 200, height: 100, alt: "home" },
  events: { file: "/images/editorial/events.jpg", width: 200, height: 133, alt: "events" },
  sob: { file: "/images/editorial/sob.jpg", width: 198, height: 112, alt: "sob" },
  newsletter: { file: "/images/editorial/newsletter.jpg", width: 160, height: 199, alt: "newsletter" },
  about: { file: "/images/editorial/about.jpg", width: 200, height: 100, alt: "about" },
}

export function visual(key: VisualKey): Visual | null {
  const v = VISUALS[key]
  return v.file ? v : null
}
