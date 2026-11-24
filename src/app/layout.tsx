import "./globals.css"
import type { Metadata } from "next"


export const metadata: Metadata = {
  title: {
    template: "%s | Black in Blockchain",
    default: "Black in Blockchain — Réseau blockchain des professionnels noirs",
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
    children
  )
}
