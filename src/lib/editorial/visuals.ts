/**
 * Catalogue des visuels éditoriaux (direction « Full-Bleed Editorial »).
 * Inventaire détaillé, direction photographique et consignes d'export :
 * docs/IMAGES.md.
 *
 * Règles :
 * - Visuels générés par IA (Canva) : lieux, matières, paysages ; jamais de
 *   personnes, jamais présentés comme des photos d'événements BIB. Les
 *   rétrospectives et les portraits restent de vraies photos aux droits
 *   approuvés (admin, /fondateurs).
 * - Un visuel n'est affiché que s'il est validé ET assez défini pour son
 *   emplacement (minWidth) : aucune image basse résolution n'est agrandie.
 *   Les aperçus de 200 px du 23 novembre restent dans le dépôt mais ne
 *   s'affichent plus.
 * - Variante mobile facultative (cadrage vertical) ; sinon le recadrage se
 *   fait sur le point focal (focus).
 */

export type VisualKey = "home" | "events" | "sob" | "newsletter" | "about" | "closing"

export type VisualStatus = "validated" | "provisional" | "missing"

export type VisualFile = {
  /** Chemin public, ex. "/images/editorial/home-2560.jpg". */
  src: string
  width: number
  height: number
}

export type VisualSource = {
  kind: "ai" | "stock" | "own"
  /** Outil ou banque d'images, ex. "Canva (génération IA)", "Unsplash". */
  provider: string
  /** Référence vérifiable : identifiant Canva, page de la photo… */
  reference: string
  /** Licence ou conditions d'utilisation. */
  license: string
}

export type Visual = {
  /** Page et section où le visuel est utilisé. */
  placement: string
  /** Rôle du visuel dans la section. */
  role: string
  status: VisualStatus
  /** Largeur minimale du fichier desktop pour son emplacement (pas d'agrandissement). */
  minWidth: number
  desktop: VisualFile | null
  /** Cadrage vertical pour les écrans < 768 px. */
  mobile: VisualFile | null
  /** Point focal CSS (object-position) quand le cadrage est automatique. */
  focus: string
  source: VisualSource
  /** Clé du texte alternatif (espace « Visuals ») ; null = décoratif (alt vide). */
  alt: VisualKey | null
  /**
   * Légende « visuel d'ambiance » : obligatoire quand le contexte (événements,
   * appel à participer) pourrait faire croire à une photo d'événement BIB.
   */
  ambient: boolean
}

const CANVA_AI = (reference: string): VisualSource => ({
  kind: "ai",
  provider: "Canva (génération IA)",
  reference,
  license: "Contenu généré dans Canva par le compte BIB : utilisation commerciale permise par les conditions Canva (AI Product Terms) ; ne représente aucune personne, marque ou événement réel.",
})

export const VISUALS: Record<VisualKey, Visual> = {
  home: {
    placement: "Accueil — hero plein écran",
    role: "Installer l'univers : lumière, matière, calme ; laisser la place au titre",
    status: "provisional",
    minWidth: 1920,
    desktop: { src: "/images/editorial/home.jpg", width: 200, height: 100 },
    mobile: null,
    focus: "60% 50%",
    source: CANVA_AI("MAHbxK6qdms (desktop), MAHb91dW-f8 (mobile 4:5)"),
    alt: "home",
    ambient: false,
  },
  about: {
    placement: "À propos — sous l'en-tête",
    role: "Horizon et ouverture : la prémisse du collectif",
    status: "provisional",
    minWidth: 1920,
    desktop: { src: "/images/editorial/about.jpg", width: 200, height: 100 },
    mobile: null,
    focus: "50% 55%",
    source: CANVA_AI("MAHbxMVUtYE"),
    alt: "about",
    ambient: false,
  },
  events: {
    placement: "Accueil (section Événements) et page Événements",
    role: "Visuel conceptuel d'une rencontre à venir, identifié comme visuel d'ambiance",
    status: "provisional",
    minWidth: 960,
    desktop: { src: "/images/editorial/events.jpg", width: 200, height: 133 },
    mobile: null,
    focus: "50% 50%",
    source: CANVA_AI("MAHbxGxt9Jc"),
    alt: "events",
    ambient: true,
  },
  sob: {
    placement: "Accueil (aperçu State of BIB) et page State of BIB",
    role: "Réseau et territoire : la donnée à l'échelle d'une ville",
    status: "provisional",
    minWidth: 1600,
    desktop: { src: "/images/editorial/sob.jpg", width: 198, height: 112 },
    mobile: null,
    focus: "50% 50%",
    source: CANVA_AI("MAHbxFcLCME"),
    alt: "sob",
    ambient: false,
  },
  newsletter: {
    placement: "Accueil — section Newsletter",
    role: "Lecture et veille : l'objet éditorial",
    status: "provisional",
    minWidth: 960,
    desktop: { src: "/images/editorial/newsletter.jpg", width: 160, height: 199 },
    mobile: null,
    focus: "50% 50%",
    source: CANVA_AI("MAHbxO0Q_TM"),
    alt: "newsletter",
    ambient: false,
  },
  closing: {
    placement: "Accueil — bandeau de clôture",
    role: "Atmosphère d'une rencontre à venir derrière l'appel à l'action",
    status: "missing",
    minWidth: 1920,
    desktop: null,
    mobile: null,
    focus: "70% 50%",
    source: CANVA_AI("à générer (quota Canva épuisé le 25 nov. 2026) — prompt dans docs/IMAGES.md"),
    alt: null,
    ambient: true,
  },
}

/** Le visuel peut-il être affiché sans agrandissement ni flou ? */
export function isDisplayable(v: Visual): v is Visual & { desktop: VisualFile } {
  if (v.status === "missing" || !v.desktop) return false
  if (v.desktop.width < v.minWidth) return false
  if (v.mobile && v.mobile.width < 750) return false
  return v.status === "validated"
}

export function visual(key: VisualKey): (Visual & { desktop: VisualFile }) | null {
  const v = VISUALS[key]
  return isDisplayable(v) ? v : null
}
