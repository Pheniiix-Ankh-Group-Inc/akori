import "./globals.css"
import type { Metadata } from "next"
import { Source_Serif_4, Inter } from "next/font/google"
import { Header }  from "@/components/sections/header"
import { Footer } from "@/components/sections/Footer"
import { ScrollInit } from "@/components/ui/ScrollInit"


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
});


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
    <html lang="fr" className={`${serif.variable} ${inter.variable}`}>
      
      <body>
        <ScrollInit />
        {children}
        </body>
    </html>
  )
}
