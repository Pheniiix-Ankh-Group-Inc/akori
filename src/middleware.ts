import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";



const PROTECTED_PATHS = [
  "/directory",
  "/dashbord",
  "/messaging",
  "/profil",
  "/settings",
  "/onbiording"
]

const AUTH_ROUTE = [
  "/login",
  "/register",
]


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session =  getSessionCookie(request);

  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const isAuthRoute = AUTH_ROUTE.some((path) => pathname.startsWith(path));

  if ( isProtected && !session){
    const url = request.nextUrl.clone();
    url.pathname =  "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && session) { 
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/directory/:path*",
    "/dashbord/:path*",
    "/messaging/:path*",
    "/profil/:path*",
    "/settings/:path*",
    "/onbiording/:path*",
    "/login",
    "/register",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ]
}
