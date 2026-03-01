// src/app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
})

export const metadata: Metadata = {
  title: {
    template: "%s | AKORI",
    default: "AKORI — Réseau blockchain des professionnels noirs",
  },
  description:
    "Plateforme communautaire blockchain pour les professionnels noirs — réseau, événements et ressources exclusives.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  )
}