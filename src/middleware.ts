import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const PROTECTED_PATHS = [
  "/directory",
  "/dashboard",
  "/messaging",
  "/profile",
  "/settings",
  "/onboarding"
]

const AUTH_ROUTES = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  
  const session = getSessionCookie(request)
  const isAuthenticated = !!session

  
  if (PROTECTED_PATHS.some(path => pathname.startsWith(path))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (AUTH_ROUTES.includes(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/directory/:path*",
    "/dashboard/:path*",
    "/messaging/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
  ]
}