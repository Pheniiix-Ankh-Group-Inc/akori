import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

const PROTECTED_PATHS = [
  "/directory",
  "/dashboard",
  "/messaging",
  "/profile",
  "/settings",
  "/onboarding",
]

const AUTH_ROUTES = ["/login", "/register"]

const intlProxy = createMiddleware(routing)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extrait la locale depuis le pathname si présente.
 * Avec localePrefix: 'as-needed', la locale par défaut n'a pas de préfixe.
 * Ex: /fr/dashboard → "fr" | /dashboard → null (locale par défaut, pas de préfixe)
 */
function extractLocalePrefix(pathname: string): string | null {
  const segment = pathname.split("/")[1]
  const isLocale = (routing.locales as readonly string[]).includes(segment)
  return isLocale ? segment : null
}

/**
 * Retourne le pathname sans préfixe de locale s'il est présent.
 * Ex: /fr/dashboard → /dashboard | /dashboard → /dashboard
 */
function stripLocale(pathname: string, localePrefix: string | null): string {
  if (localePrefix && pathname.startsWith(`/${localePrefix}`)) {
    return pathname.slice(`/${localePrefix}`.length) || "/"
  }
  return pathname
}

/**
 * Construit une URL de redirection en préservant le préfixe de locale si présent.
 * Avec as-needed, la locale par défaut n'a pas de préfixe → /login (pas /en/login).
 */
function buildLocalizedUrl(
  path: string,
  localePrefix: string | null,
  base: string
): URL {
  const prefix = localePrefix ? `/${localePrefix}` : ""
  return new URL(`${prefix}${path}`, base)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = getSessionCookie(request)
  const isAuthenticated = !!session

  const localePrefix = extractLocalePrefix(pathname)
  const strippedPath = stripLocale(pathname, localePrefix)

  if (PROTECTED_PATHS.some((path) => strippedPath.startsWith(path))) {
    if (!isAuthenticated) {
      const loginUrl = buildLocalizedUrl("/login", localePrefix, request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (AUTH_ROUTES.includes(strippedPath) && isAuthenticated) {
    return NextResponse.redirect(
      buildLocalizedUrl("/dashboard", localePrefix, request.url)
    )
  }

  return intlProxy(request)
}

export const config = {
  matcher: [
    "/((?!_next|api|_vercel|.*\\..*).*)",
  ],
}