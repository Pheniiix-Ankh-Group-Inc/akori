// src/types/index.ts

export type Plan = "free" | "pioneer" | "institution"

export type OrgRole = "admin" | "member"

export type ConnectionStatus = "pending" | "accepted" | "declined"

export const SECTORS = [
  "Développement",
  "Entrepreneuriat",
  "Finance",
  "Droit",
  "Éducation",
  "Gouvernance",
  "Santé",
  "Médias",
  "Institutions",
  "Recherche",
  "Autre",
] as const

export type Sector = (typeof SECTORS)[number]

export type PartnerType = "entreprise" | "institution" | "état" | "université" | "média"

export interface Profile {
  id: string
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  role: string | null
  sectors: Sector[] | null
  bio: string | null
  city: string | null
  country: string
  linkedin_url: string | null
  twitter_url: string | null
  website_url: string | null
  is_verified: boolean
  is_available: boolean
  plan: Plan
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  onboarding_done: boolean
  created_at: string
  updated_at: string
}