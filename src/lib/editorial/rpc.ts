/**
 * Traduction des erreurs des fonctions transactionnelles (migration 0006) en
 * messages opérateur. Module pur, testé unitairement. Aucun détail SQL n'est
 * renvoyé à l'interface.
 */
export interface DbError {
  code?: string
  message?: string
}

const MESSAGES: Record<string, string> = {
  BIB01: "Ce contenu a été modifié par une autre personne depuis l'ouverture du formulaire. Rechargez la page pour récupérer la dernière version.",
  BIB02: "Contenu introuvable.",
  BIB03: "Publication refusée : au moins un média n'est pas diffusable (droits non approuvés, référence ou texte alternatif manquant).",
  BIB04: "Ce changement de statut n'est pas autorisé.",
  BIB05: "Contenu incomplet : un titre est requis dans au moins une langue.",
  "23505": "Cet identifiant d'URL est déjà utilisé.",
  "23514": "Une valeur ne respecte pas les règles de saisie.",
  "42501": "Action non autorisée.",
}

export function editorialErrorMessage(error: DbError | null | undefined, fallback = "Enregistrement impossible."): string {
  if (!error?.code) return fallback
  return MESSAGES[error.code] ?? fallback
}

/** Horodatage attendu (verrou optimiste) lu depuis le formulaire. */
export function expectedUpdatedAt(formData: FormData): string | null {
  const raw = formData.get("expected_updated_at")
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 40) return null
  return Number.isNaN(Date.parse(raw)) ? null : raw
}
