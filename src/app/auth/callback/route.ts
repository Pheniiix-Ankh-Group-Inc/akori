import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/env"

const OTP_TYPES: EmailOtpType[] = ["magiclink", "email", "invite", "recovery"]

/**
 * Retour des liens Supabase Auth (lien magique, invitation, récupération).
 * Redirige toujours vers une route interne de l'administration.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const fail = NextResponse.redirect(new URL("/login?error=link", url.origin))
  if (!isSupabaseConfigured()) return fail

  const supabase = await createClient()
  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as EmailOtpType | null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return fail
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) return fail
  } else {
    return fail
  }

  return NextResponse.redirect(new URL("/admin", url.origin))
}
