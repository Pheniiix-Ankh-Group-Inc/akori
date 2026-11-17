"use server"

import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { editorialErrorMessage } from "@/lib/editorial/rpc"
import { AUTOMATION_MODULES } from "@/lib/admin/automation"

const MODES = ["auto", "review", "paused"]

/** Changement de mode (auto / review / paused) — admin, journalisé en base. */
export async function setAutomationModeAction(formData: FormData) {
  await requireAdmin()
  const moduleName = String(formData.get("module") ?? "")
  const mode = String(formData.get("mode") ?? "")
  const back = String(formData.get("back") ?? "/admin/automatisations")
  const safeBack = back.startsWith("/admin") && !back.startsWith("//") ? back : "/admin/automatisations"
  if (!(AUTOMATION_MODULES as readonly string[]).includes(moduleName) || !MODES.includes(mode)) {
    redirect(`${safeBack}?error=invalid`)
  }
  const supabase = await createClient()
  const { error } = await supabase.rpc("set_automation_mode", { p_module: moduleName, p_mode: mode })
  if (error) redirect(`${safeBack}?error=${encodeURIComponent(editorialErrorMessage(error, "Changement de mode impossible."))}`)
  redirect(`${safeBack}?mode=1`)
}
