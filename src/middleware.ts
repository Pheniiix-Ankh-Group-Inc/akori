import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const PROTECTED_PATHS = [
  "/dashboard",
  "/directory",
  "/messaging",
  "/profile",
  "/settings",
  "/onboarding",
]

const AUTH_ROUTES = [
  "/login",
  "/register",
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = getSessionCookie(request)

  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path))
  const isAuthRoute = AUTH_ROUTES.some((path) => pathname.startsWith(path))

  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && session) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/directory/:path*",
    "/messaging/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
  ],
}