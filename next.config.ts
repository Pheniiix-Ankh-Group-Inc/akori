// next.config.ts
import type { NextConfig } from "next"
import { securityHeaders, supabaseOrigin } from "./src/lib/security/headers"

const isDev = process.env.NODE_ENV === "development"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null
const supabaseHost = (() => {
  const origin = supabaseOrigin(supabaseUrl)
  return origin ? new URL(origin).hostname : null
})()

const nextConfig: NextConfig = {
  // BIB does not use the next-intl useExtracted message extractor.
  // Alias its request config directly so next-intl/plugin need not load
  // @parcel/watcher (unpatched picomatch CVE-2026-112366).
  turbopack: {
    resolveAlias: { "next-intl/config": "./src/i18n/request.ts" },
  },
  poweredByHeader: false,

  experimental: {
    // Import d'un export .ics Luma depuis l'admin (10 Mo max, vérifié dans l'action).
    serverActions: { bodySizeLimit: "11mb" },
  },

  images: {
    // Seul le projet Supabase configuré est autorisé (plus de Sanity).
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : [],
  },

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders({ supabaseUrl, isDev }) }]
  },
}

export default nextConfig
