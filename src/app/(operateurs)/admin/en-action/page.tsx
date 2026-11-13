import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { Notice, StatusBadge } from "@/components/admin/Notice"

export const metadata: Metadata = { title: "BIB en action" }

type Row = { id: string; slug: string; status: string; occurred_on: string | null; story_translations: { locale: string; title: string }[]; story_media: { media_id: string }[] }

export default async function StoriesAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireEditor()
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase
    .from("stories")
    .select("id, slug, status, occurred_on, story_translations(locale, title), story_media(media_id)")
    .order("occurred_on", { ascending: false, nullsFirst: false })
    .limit(300)
  const rows = (data ?? []) as Row[]

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb">Administration</p>
          <h1>BIB en action</h1>
        </div>
        <div className="adm-actions">
          <Link href="/admin/en-action/nouveau" className="adm-btn adm-btn-primary">Nouvelle rétrospective</Link>
        </div>
      </div>
      <Notice params={params} />
      {rows.length === 0 ? (
        <p className="adm-muted">Aucune rétrospective. Importez d&apos;abord les photos et vidéos autorisées dans Médias.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr><th scope="col">Titre</th><th scope="col">Date</th><th scope="col">Médias</th><th scope="col">Statut</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/admin/en-action/${s.id}`}>{s.story_translations.find((t) => t.locale === "fr")?.title ?? s.story_translations[0]?.title ?? s.slug}</Link></td>
                <td>{s.occurred_on ?? "—"}</td>
                <td>{s.story_media.length}</td>
                <td><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
