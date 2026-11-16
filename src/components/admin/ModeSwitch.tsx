import { setAutomationModeAction } from "@/app/(operateurs)/admin/automation-actions"
import { MODE_HELP, MODE_LABELS, MODULE_LABELS, type AutomationModule, type Mode } from "@/lib/admin/automation"

/** Sélecteur de mode d'un module (lecture pour tous, modification admin). */
export function ModeSwitch({ module, mode, isAdmin, back }: { module: AutomationModule; mode: Mode; isAdmin: boolean; back: string }) {
  return (
    <div className="adm-kpi">
      <strong>{MODULE_LABELS[module]}</strong>
      <span>Mode actuel : <span className={`adm-status adm-status-mode-${mode}`}>{MODE_LABELS[mode]}</span></span>
      <span className="adm-muted">{MODE_HELP[module][mode]}</span>
      {isAdmin && (
        <form action={setAutomationModeAction} className="adm-row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <input type="hidden" name="module" value={module} />
          <input type="hidden" name="back" value={back} />
          {(["auto", "review", "paused"] as Mode[]).map((m) => (
            <button key={m} name="mode" value={m} type="submit" className="adm-btn" aria-pressed={m === mode} disabled={m === mode}>
              {MODE_LABELS[m]}
            </button>
          ))}
        </form>
      )}
    </div>
  )
}
