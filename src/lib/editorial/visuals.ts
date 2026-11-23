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
 * la section s'affiche sans image, comme aujourd'hui.
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
  home: { file: null, width: 2400, height: 1200, alt: "home" },
  events: { file: null, width: 2400, height: 1600, alt: "events" },
  sob: { file: null, width: 2400, height: 1350, alt: "sob" },
  newsletter: { file: null, width: 1600, height: 2000, alt: "newsletter" },
  about: { file: null, width: 2400, height: 1200, alt: "about" },
}

export function visual(key: VisualKey): Visual | null {
  const v = VISUALS[key]
  return v.file ? v : null
}
