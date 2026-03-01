import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {


  // If the user is authenticated or accessing a public route, allow the request to proceed
  return NextResponse.next();
}