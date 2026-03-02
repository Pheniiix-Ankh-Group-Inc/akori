"use client"

import { useScrollReveal } from "@/components/hooks/Usescrollreveal"

/**
 * ScrollInit
 * Composant client léger qui initialise le scroll reveal.
 * À placer une seule fois dans le layout ou la page.
 */
export function ScrollInit() {
  useScrollReveal()
  return null
}