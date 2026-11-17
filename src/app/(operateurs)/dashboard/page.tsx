import { redirect } from "next/navigation"

/** Route historique : redirige vers l'administration (protégée). */
export default function DashboardPage() {
  redirect("/admin")
}
