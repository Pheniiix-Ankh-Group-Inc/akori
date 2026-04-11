import type { ReactNode } from "react";
export { viewport } from "@/lib/metadata";
import "./globals.css";

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return children
}