const OK_MESSAGES: Record<string, string> = {
  saved: "Enregistré.",
  published: "Publié sur le site.",
  unpublished: "Retiré du site (repassé en brouillon).",
  archived: "Archivé : plus visible sur le site.",
  deleted: "Supprimé.",
  uploaded: "Fichier importé.",
}

/** Messages de retour des actions (paramètres d'URL). */
export function Notice({ params }: { params: Record<string, string | undefined> }) {
  if (params.error) {
    return (
      <p className="adm-notice adm-notice-error" role="alert">
        Erreur : {params.error}
      </p>
    )
  }
  const key = Object.keys(OK_MESSAGES).find((k) => params[k] === "1")
  if (!key) return null
  return (
    <p className="adm-notice adm-notice-ok" role="status">
      {OK_MESSAGES[key]}
    </p>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const label = status === "published" ? "Publié" : status === "archived" ? "Archivé" : "Brouillon"
  return <span className={`adm-status adm-status-${status}`}>{label}</span>
}
