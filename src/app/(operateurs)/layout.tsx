import "../globals.css"
import type { Metadata } from "next"
import { Inter, Source_Serif_4 } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap" })

export const metadata: Metadata = {
  title: { template: "%s | BIB — opérateurs", default: "BIB — espace opérateurs" },
  robots: { index: false, follow: false },
}

/**
 * Espace opérateurs (connexion et administration), hors du routage de langue.
 * Réutilise les styles existants (globals.css : auth-*, member-*, dash-*).
 */
export default function OperatorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning className={`${serif.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  )
}
