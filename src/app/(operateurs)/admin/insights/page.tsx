import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { isAiConfigured } from "@/lib/env"
import { Notice } from "@/components/admin/Notice"
import type { InsightContent } from "@/lib/sob/insights"
import { generateInsightAction, setInsightStatusAction } from "./actions"

export const metadata: Metadata = { title: "Insights State of BIB" }

type Row = { id: string; locale: string; status: string; created_at: string; content: InsightContent }

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const editor = await requireEditor()
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from("sob_insights").select("id, locale, status, created_at, content").order("created_at", { ascending: false }).limit(50)
  const rows = (data ?? []) as Row[]
  const aiOn = isAiConfigured()

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb">Administration</p>
          <h1>Insights State of BIB</h1>
        </div>
      </div>
      <Notice params={params} />
      <p className="adm-muted" style={{ marginBottom: "1.5rem" }}>
        Brouillons rédigés par le moteur IA à partir des données publiées ; les chiffres sont insérés par le code.
        Rien n&apos;est publié automatiquement : la publication sur le site est réservée aux administrateurs.
      </p>
      <form action={generateInsightAction} className="adm-actions" style={{ marginBottom: "2rem" }}>
        <label htmlFor="locale" className="adm-muted">Langue</label>
        <select id="locale" name="locale" className="adm-input" style={{ width: "auto" }} defaultValue="fr">
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
        <button className="adm-btn adm-btn-primary" type="submit" disabled={!aiOn}>Générer un brouillon</button>
        {!aiOn && <span className="adm-muted">Moteur IA désactivé (FEATURE_AI) ou non configuré.</span>}
      </form>
      {rows.length === 0 ? (
        <p className="adm-muted">Aucun insight.</p>
      ) : (
        rows.map((r) => (
          <article key={r.id} className="dash-card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
            <p className="adm-muted">{r.locale.toUpperCase()} · {r.status} · {r.created_at.slice(0, 16).replace("T", " ")}</p>
            <h2 className="heading-xs">{r.content.title}</h2>
            <p style={{ whiteSpace: "pre-line" }}>{r.content.rendered_body}</p>
            <p className="adm-muted">Limites : {r.content.limitations}</p>
            {editor.role === "admin" && (
              <div className="adm-actions">
                {r.status !== "published" && (
                  <form action={setInsightStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="published" /><button className="adm-btn adm-btn-primary">Publier sur le site</button></form>
                )}
                {r.status === "published" && (
                  <form action={setInsightStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="draft" /><button className="adm-btn">Retirer</button></form>
                )}
                {r.status !== "rejected" && r.status !== "published" && (
                  <form action={setInsightStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="rejected" /><button className="adm-btn adm-btn-danger">Rejeter</button></form>
                )}
              </div>
            )}
          </article>
        ))
      )}
    </>
  )
}
