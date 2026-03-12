// next.config.ts
import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  async headers() {
    const cspPolicy = isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.sanity.io; img-src 'self' https: data:; font-src 'self' fonts.googleapis.com fonts.gstatic.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; connect-src 'self' ws: wss: cdn.sanity.io"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.sanity.io; img-src 'self' https: data:; font-src 'self' fonts.googleapis.com fonts.gstatic.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com"

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { 
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload"
          },
          {
            key: "Content-Security-Policy",
            value: cspPolicy
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()"
          }
        ],
      },
    ]
  },
}

export default nextConfig