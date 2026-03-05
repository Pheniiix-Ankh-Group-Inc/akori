import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware pour protéger les routes authentifiées
 * 
 * ⚠️ IMPORTANT: Le middleware s'exécute dans l'edge runtime qui n'a pas accès à Node.js crypto.
 * On vérifie simplement la présence du cookie de session plutôt que de le déchiffrer.
 * La validation cryptographique se fera côté serveur lors du rendu des pages.
 */
export function middleware(request: NextRequest) {
  // Routes à protéger
  const protectedPaths = ["/membres"]

  // Vérifier si la route est protégée
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath) {
    // Vérifier la présence du cookie de session Better-Auth
    // Le cookie par défaut s'appelle "better-auth.session_token"
    const sessionCookie =
      request.cookies.get("better-auth.session_token")?.value ||
      request.cookies.get("session_token")?.value

    // Si pas de cookie, rediriger vers la connexion
    if (!sessionCookie) {
      const loginUrl = new URL("/connexion", request.url)
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

// Configuration des routes à intercepter
export const config = {
  matcher: [
    "/membres/:path*",
    // Exclure les fichiers statiques et routes spéciales
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
