import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { createDraftPreviewUrls } from "@/lib/media/preview"
import { MediaUploader } from "@/components/admin/MediaUploader"
import { Notice } from "@/components/admin/Notice"

export const metadata: Metadata = { title: "Médias" }

type Row = { id: string; kind: string; mime_type: string; rights_status: string; public_path: string | null; alt_text: Record<string, string>; size_bytes: number }

const RIGHTS = { pending: "En attente", approved: "Approuvés", rejected: "Refusés", revoked: "Révoqués" } as Record<string, string>

export default async function MediaListPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireEditor()
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase
    .from("media_assets")
    .select("id, kind, mime_type, rights_status, public_path, alt_text, size_bytes")
    .order("created_at", { ascending: false })
    .limit(300)
  const rows = (data ?? []) as Row[]
  const previews = await createDraftPreviewUrls(rows.filter((r) => r.kind === "image" || r.kind === "poster").map((r) => r.id))

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb">Administration</p>
          <h1>Médias</h1>
        </div>
      </div>
      <Notice params={params} />
      <MediaUploader />
      {rows.length === 0 ? (
        <p className="adm-muted">Aucun média importé.</p>
      ) : (
        <div className="adm-grid">
          {rows.map((m) => (
            <Link key={m.id} href={`/admin/medias/${m.id}`} className="adm-media" style={{ color: "var(--blanc)", textDecoration: "none" }}>
              {previews[m.id] ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL signée privée, temporaire
                <img src={previews[m.id]} alt={m.alt_text?.fr || m.alt_text?.en || ""} />
              ) : (
                <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border-h)", borderRadius: 4 }}>{m.kind}</div>
              )}
              <span>{m.kind} · {(m.size_bytes / 1048576).toFixed(1)} Mo</span>
              <span className="adm-muted">Droits : {RIGHTS[m.rights_status] ?? m.rights_status}{m.public_path ? " · diffusé" : ""}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
