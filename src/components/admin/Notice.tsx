const OK_MESSAGES: Record<string, string> = {
  saved: "Enregistré.",
  published: "Publié sur le site.",
  unpublished: "Retiré du site (repassé en brouillon).",
  archived: "Archivé : plus visible sur le site.",
  deleted: "Supprimé.",
  uploaded: "Fichier importé.",
  synced: "Synchronisation terminée : le détail figure dans le journal.",
  approved: "Approuvé.",
  rejected: "Rejeté.",
  restored: "Version restaurée.",
  scheduled: "Envoi planifié.",
  cancelled: "Annulé.",
  mode: "Mode d'automatisation mis à jour.",
  sent: "Envoi déclenché.",
  checked: "Contrôle terminé : PostgreSQL et Storage sont cohérents (voir le journal).",
  dispatched: "Traitement demandé à GitHub Actions : le résultat apparaîtra dans le journal d'ici quelques minutes.",
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

const RUN_LABELS: Record<string, string> = {
  running: "En cours",
  succeeded: "Réussie",
  failed: "Échec",
  skipped: "Ignorée",
  pending: "En attente",
  validated: "Validée",
  blocked: "Bloquée",
  rejected: "Rejetée",
  published: "Publiée",
  superseded: "Remplacée",
}

/** Statut d'exécution (synchronisations, versions de données, envois). */
export function RunBadge({ status }: { status: string }) {
  return <span className={`adm-status adm-status-${status}`}>{RUN_LABELS[status] ?? status}</span>
}
