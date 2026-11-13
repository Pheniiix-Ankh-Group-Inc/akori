import "./admin.css"
import Link from "next/link"
import { requireEditor } from "@/lib/auth/editor"
import { signOut } from "../login/actions"

export const dynamic = "force-dynamic"

/**
 * Administration minimale : événements et BIB en action uniquement.
 * Chaque page et chaque action revérifie l'habilitation côté serveur.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const editor = await requireEditor()

  return (
    <div className="member-layout">
      <aside className="member-sidebar" aria-label="Administration">
        <div className="member-sidebar-logo">
          <Link href="/admin" className="logo">BIB <em>admin</em></Link>
        </div>
        <nav className="member-sidebar-nav">
          <Link href="/admin" className="member-nav-link">Tableau de bord</Link>
          <Link href="/admin/evenements" className="member-nav-link">Événements</Link>
          <Link href="/admin/en-action" className="member-nav-link">BIB en action</Link>
          <Link href="/admin/medias" className="member-nav-link">Médias</Link>
          <Link href="/admin/temoignages" className="member-nav-link">Témoignages</Link>
          <Link href="/admin/insights" className="member-nav-link">Insights State of BIB</Link>
          <Link href="/admin/newsletter" className="member-nav-link">Newsletter (suivi)</Link>
        </nav>
        <div className="member-sidebar-footer">
          <p className="adm-muted" style={{ padding: "0 0.85rem 0.75rem" }}>
            {editor.email} · {editor.role === "admin" ? "administrateur" : "éditeur"}
          </p>
          <form action={signOut}>
            <button type="submit" className="member-nav-link" style={{ background: "none", border: 0, cursor: "pointer", width: "100%" }}>
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  )
}
