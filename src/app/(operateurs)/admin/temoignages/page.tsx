import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { Notice, StatusBadge } from "@/components/admin/Notice"

export const metadata: Metadata = { title: "Témoignages" }

type Row = { id: string; author_name: string; locale: string; status: string; quote: string }

export default async function TestimonialsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireEditor()
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from("testimonials").select("id, author_name, locale, status, quote").order("created_at", { ascending: false }).limit(300)
  const rows = (data ?? []) as Row[]
  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb">Administration</p>
          <h1>Témoignages</h1>
        </div>
        <Link href="/admin/temoignages/nouveau" className="adm-btn adm-btn-primary">Nouveau témoignage</Link>
      </div>
      <Notice params={params} />
      <p className="adm-muted" style={{ marginBottom: "1rem" }}>Uniquement des témoignages authentiques, avec l&apos;accord écrit de leur auteur.</p>
      {rows.length === 0 ? (
        <p className="adm-muted">Aucun témoignage.</p>
      ) : (
        <table className="adm-table">
          <thead><tr><th scope="col">Auteur</th><th scope="col">Extrait</th><th scope="col">Langue</th><th scope="col">Statut</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/temoignages/${r.id}`}>{r.author_name}</Link></td>
                <td>{r.quote.slice(0, 80)}{r.quote.length > 80 ? "…" : ""}</td>
                <td>{r.locale.toUpperCase()}</td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
