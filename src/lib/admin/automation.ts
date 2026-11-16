export const AUTOMATION_MODULES = ["sob", "sob_insights", "newsletter"] as const
export type AutomationModule = (typeof AUTOMATION_MODULES)[number]
export type Mode = "auto" | "review" | "paused"

export const MODULE_LABELS: Record<AutomationModule, string> = {
  sob: "State of BIB — publication des données",
  sob_insights: "State of BIB — analyses IA",
  newsletter: "Newsletter FR/EN",
}

export const MODE_LABELS: Record<Mode, string> = {
  auto: "Automatique",
  review: "Revue humaine",
  paused: "En pause",
}

export const MODE_HELP: Record<AutomationModule, Record<Mode, string>> = {
  sob: {
    auto: "Fonctionnement normal : une version valide est publiée sans approbation ; une forte variation passe des contrôles renforcés automatiques.",
    review: "Mode optionnel : les versions valides attendent l'approbation d'un administrateur.",
    paused: "Les versions sont collectées et validées, jamais publiées.",
  },
  sob_insights: {
    auto: "Fonctionnement normal : analyse générée, contrôlée (faits, tendance, périmètre) puis publiée sans approbation.",
    review: "Analyses générées en brouillon, à publier par un administrateur.",
    paused: "Aucune analyse générée.",
  },
  newsletter: {
    auto: "Brouillons le lundi, contrôles le mardi, envoi le mercredi 9 h (Toronto) s'ils sont prêts.",
    review: "L'envoi exige l'approbation explicite d'un administrateur.",
    paused: "Aucun envoi ; la préparation éditoriale reste possible.",
  },
}

/** Modes courants (lecture éditeur via RLS) ; défaut « review » si absent. */
export async function readModes(supabase: { from: (t: string) => { select: (c: string) => PromiseLike<{ data: unknown }> } }): Promise<Record<AutomationModule, Mode>> {
  const { data } = await supabase.from("automation_settings").select("module, mode")
  // Défauts si le réglage est absent : State of BIB en automatique (MVP).
  const out: Record<AutomationModule, Mode> = { sob: "auto", sob_insights: "auto", newsletter: "review" }
  for (const r of (data ?? []) as { module: string; mode: string }[]) {
    if ((AUTOMATION_MODULES as readonly string[]).includes(r.module) && ["auto", "review", "paused"].includes(r.mode)) {
      out[r.module as AutomationModule] = r.mode as Mode
    }
  }
  return out
}
