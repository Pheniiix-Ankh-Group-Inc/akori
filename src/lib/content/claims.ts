/**
 * Registre central des contenus factuels NON VÉRIFIÉS de l'accueil.
 *
 * Règle : par défaut, rien de ce registre n'est affiché publiquement.
 * HOME_SHOW_UNVERIFIED_SECTIONS=true les réaffiche (décision éditoriale
 * explicite, environnement par environnement). Pour publier durablement un
 * élément, le sourcer puis le retirer de ce registre (docs/EDITORIAL_CLAIMS.md).
 *
 * Aucun texte n'est réécrit ni inventé : les éléments sont masqués, jamais
 * remplacés. Module pur (pas d'accès à l'environnement), testé unitairement.
 */

export type ClaimKind = "figure" | "announcement" | "history" | "third_party" | "process"

/** Sections entières dont le contenu n'est pas sourcé. */
export const UNVERIFIED_SECTIONS = [
  "Constellation",
  "Ledger",
  "Pillars",
  "Data",
  "Orgs",
  "News",
  "Portraits",
  "Chains",
  "Gathering",
  "Stats",
  "Ticker",
] as const
export type UnverifiedSection = (typeof UNVERIFIED_SECTIONS)[number]

/** Éléments isolés, dans des sections toujours affichées. */
export const UNVERIFIED_KEYS: Record<string, { kind: ClaimKind; reason: string }> = {
  "Hero.meta2": { kind: "figure", reason: "Nombre de chapitres (« 37 chapitres ») sans source." },
  "Cta.sub": { kind: "process", reason: "Délai de vérification de candidature (« 72 heures ») non documenté ; aucune adhésion n'est ouverte." },
}

export function isSectionVisible(section: string, showUnverified: boolean): boolean {
  return showUnverified || !(UNVERIFIED_SECTIONS as readonly string[]).includes(section)
}

export function isKeyVisible(key: string, showUnverified: boolean): boolean {
  return showUnverified || !(key in UNVERIFIED_KEYS)
}
