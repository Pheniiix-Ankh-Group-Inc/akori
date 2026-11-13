import { NextResponse, type NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { updateOperatorSession } from "./lib/supabase/proxy-session"

const intlProxy = createMiddleware(routing)

/**
 * Routes opérateurs, servies hors du segment [locale] (interface unique) :
 * elles ne passent pas par le routage de langue next-intl.
 */
const OPERATOR_PREFIXES = ["/admin", "/login", "/register", "/dashboard", "/auth"]

function isOperatorPath(pathname: string): boolean {
  return OPERATOR_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isOperatorPath(pathname)) {
    const { response, userId } = await updateOperatorSession(request)

    // Première barrière : pas de session → page de connexion opérateur.
    if ((pathname === "/admin" || pathname.startsWith("/admin/")) && !userId) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  return intlProxy(request)
}

export const config = {
  matcher: [
    // Toutes les routes sauf _next, api, _vercel et fichiers statiques.
    "/((?!_next|api|_vercel|.*\\..*).*)",
  ],
}
