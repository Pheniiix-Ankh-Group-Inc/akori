import "./admin.css"
import Link from "next/link"
import { requireEditor } from "@/lib/auth/editor"
import { signOut } from "../login/actions"
import { AdminNav } from "./AdminNav"

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
        <AdminNav />
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
