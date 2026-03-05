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

export type EvenementType = "conference" | "webinar" | "hackathon" | "workshop" | "networking"

export const EVENEMENT_TYPE_LABELS: Record<EvenementType, string> = {
  conference: "Conférence",
  webinar:    "Webinar",
  hackathon:  "Hackathon",
  workshop:   "Workshop",
  networking: "Networking",
}

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

// Sanity types
export interface Evenement {
  _id:         string
  titre:       string
  type:        EvenementType
  date:        string
  lieu:        string
  description: string
  prix:        string
  lumaUrl?:    string
  featured:    boolean
  image?:      { asset: { _ref: string } }
}

export interface Ressource {
  _id:          string
  titre:        string
  categorie:    string
  extrait:      string
  auteur:       string
  tempsLecture: number
  featured:     boolean
  publishedAt:  string
}

export interface Partenaire {
  _id:         string
  nom:         string
  code:        string
  type:        string
  description: string
  logo?:       { asset: { _ref: string } }
}

export interface MembreEquipe {
  _id:       string
  nom:       string
  initiales: string
  role:      string
  bio:       string
  linkedin?: string
  twitter?:  string
  photo?:    { asset: { _ref: string } }
}