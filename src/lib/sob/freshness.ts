/** Seuil au-delà duquel les données State of BIB sont signalées comme anciennes. */
export const SOB_STALE_DAYS = 120

export interface SobFreshness {
  /** Âge en jours de l'instantané (null si la date est illisible). */
  ageDays: number | null
  stale: boolean
}

/**
 * Âge réel de l'instantané (date de la source, jamais la date de génération ni
 * la date du jour). Une date invalide est traitée comme ancienne : on ne
 * présente jamais comme récentes des données non datées.
 */
export function sobFreshness(snapshotDate: string, now: Date = new Date(), threshold = SOB_STALE_DAYS): SobFreshness {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(snapshotDate)
  if (!m) return { ageDays: null, stale: true }
  const snap = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(snap)) return { ageDays: null, stale: true }
  const ageDays = Math.floor((now.getTime() - snap) / 86_400_000)
  return { ageDays, stale: ageDays > threshold }
}
