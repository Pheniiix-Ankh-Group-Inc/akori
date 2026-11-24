import { notFound } from "next/navigation"

/**
 * Toute URL publique inconnue (/fr/xyz…) passe par la 404 localisée du
 * segment (public), avec menu et pied de page, au lieu de la 404 nue.
 */
export default function CatchAllPage() {
  notFound()
}
