import "./globals.css"
import type { Metadata } from "next"


export const metadata: Metadata = {
  title: {
    template: "%s | Black in Blockchain",
    default: "Black in Blockchain",
  },
  description:
    "Black in Blockchain : rencontres, échanges et découvertes autour de la blockchain, centrés sur les professionnels noirs.",
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
