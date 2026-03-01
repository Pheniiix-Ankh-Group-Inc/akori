// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Fusionner les classes Tailwind sans conflits
// Usage : cn("px-4 py-2", isActive && "bg-accent", className)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formater une date en français canadien
// Usage : formatDate("2026-03-15") → "15 mars 2026"
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString))
}

// Formater un montant en devise
// Usage : formatCurrency(25) → "25,00 $CA"
export function formatCurrency(amount: number, currency = "CAD"): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency,
  }).format(amount)
}

// Tronquer un texte
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + "..."
}