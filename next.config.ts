// next.config.ts
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"
import { securityHeaders, supabaseOrigin } from "./src/lib/security/headers"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const isDev = process.env.NODE_ENV === "development"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null
const supabaseHost = (() => {
  const origin = supabaseOrigin(supabaseUrl)
  return origin ? new URL(origin).hostname : null
})()

const nextConfig: NextConfig = {
  turbopack: {},
  poweredByHeader: false,

  images: {
    // Seul le projet Supabase configuré est autorisé (plus de Sanity).
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : [],
  },

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders({ supabaseUrl, isDev }) }]
  },
}

export default withNextIntl(nextConfig)
