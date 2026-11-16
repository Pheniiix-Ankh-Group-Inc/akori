import "../globals.css"
import type { Metadata } from "next"
import { Inter, Fraunces } from "next/font/google"

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap", axes: ["opsz"], style: ["normal", "italic"] })

export const metadata: Metadata = {
  title: { template: "%s | BIB — opérateurs", default: "BIB — espace opérateurs" },
  robots: { index: false, follow: false },
}

/**
 * Espace opérateurs (connexion et administration), hors du routage de langue.
 * Même charte claire que le site public (globals.css : auth-*, member-*, dash-*).
 */
export default function OperatorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
        {children}
      </body>
    </html>
  )
}
