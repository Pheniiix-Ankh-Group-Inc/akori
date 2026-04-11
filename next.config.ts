// next.config.ts
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const isDev = process.env.NODE_ENV === "development"

const nextConfig: NextConfig = {
  turbopack: {},

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Optionnel : Ajoute ceci pour les icônes de coins si tu les utilises plus tard
      { protocol: "https", hostname: "coin-images.coingecko.com" }, 
    ],
  },

  async headers() {
    // AJOUT DE https://api.coingecko.com DANS connect-src
    const cspPolicy = isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.sanity.io; img-src 'self' https: data:; font-src 'self' fonts.googleapis.com fonts.gstatic.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; connect-src 'self' ws: wss: cdn.sanity.io https://api.coingecko.com; frame-src 'self' https://lu.ma https://*.lu.ma https://luma.com https://*.luma.com;"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.sanity.io; img-src 'self' https: data:; font-src 'self' fonts.googleapis.com fonts.gstatic.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; connect-src 'self' cdn.sanity.io https://api.coingecko.com; frame-src 'self' https://lu.ma https://*.lu.ma https://luma.com https://*.luma.com;"

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: cspPolicy,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)