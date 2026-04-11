// Importé dans app/layout.tsx (viewport) et [locale]/layout.tsx (generateMetadata).

import type { Metadata, Viewport } from "next"

// ── Viewport (commun à toutes les locales) ─────────────────────────────────
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080909",
}

// ── Base URL ───────────────────────────────────────────────────────────────
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.anbachain.org"

// ── Métadonnées par locale ─────────────────────────────────────────────────
type LocaleMetaMap = Record<string, Pick<Metadata, "title" | "description">>


export const localeMeta: LocaleMetaMap = {
  fr: {
    title: {
      default: "AnbaChain — Plateforme blockchain des professionnels Caraïbéens",
      template: "%s · AnbaChain",
    },
    description:
      "AnbaChain est une communauté et un incubateur indépendants dédiés aux bâtisseurs de l'écosystème blockchain — espace physique, programme d'accompagnement et réseau.",
  },
  en: {
    title: {
      default: "AnbaChain — Blockchain Incubator",
      template: "%s · AnbaChain",
    },
    description:
      "AnbaChain is an independent community and incubator for blockchain builders — physical space, editorial program, and professional network.",
  },
  es: {
    title: {
      default: "AnbaChain — Incubadora Blockchain",
      template: "%s · AnbaChain",
    },
    description:
      "AnbaChain es una comunidad e incubadora independiente para constructores del ecosistema blockchain — espacio físico, programa editorial y red profesional.",
  },
}

// ── Métadonnées OG partagées ───────────────────────────────────────────────
export const sharedMeta: Partial<Metadata> = {
  metadataBase: new URL(siteUrl),
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "AnbaChain - Réseau de professionnels noirs",
    description: "Plateforme blockchain communautaire",
    type: "website",
    siteName: "AnbaChain",
    images: [
      {
        url: "/og-image.png", // à créer dans /public
        width: 1200,
        height: 630,
        alt: "ChainBase",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@anbachain.org",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
}