"use client"
import { SobFilterBar } from "./SobExplorer"
import { useMonthLabel } from "./SobEcosystems"

/** Barre de filtres avec libellés de mois localisés. */
export function SobPeriodBar() {
  const monthLabel = useMonthLabel()
  return <SobFilterBar monthLabel={monthLabel} />
}
