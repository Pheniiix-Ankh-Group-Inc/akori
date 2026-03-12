"use client"

import { Header } from "@/components/sections/header"
import { Footer } from "@/components/sections/Footer"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}