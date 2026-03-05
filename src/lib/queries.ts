import { groq } from "next-sanity"

// Événements
export const EVENEMENTS_QUERY = groq`
  *[_type == "evenement"] | order(date asc) {
    _id,
    titre,
    type,
    date,
    lieu,
    description,
    prix,
    lumaUrl,
    featured,
    image
  }
`

export const EVENEMENT_FEATURED_QUERY = groq`
  *[_type == "evenement" && featured == true][0] {
    _id,
    titre,
    type,
    date,
    lieu,
    description,
    prix,
    lumaUrl,
    image
  }
`

// Ressources
export const RESSOURCES_QUERY = groq`
  *[_type == "ressource"] | order(publishedAt desc) {
    _id,
    titre,
    categorie,
    extrait,
    auteur,
    tempsLecture,
    featured,
    publishedAt
  }
`

// Partenaires
export const PARTENAIRES_QUERY = groq`
  *[_type == "partenaire"] | order(_createdAt asc) {
    _id,
    nom,
    code,
    type,
    description,
    logo
  }
`

// Équipe
export const EQUIPE_QUERY = groq`
  *[_type == "membreEquipe"] | order(ordre asc) {
    _id,
    nom,
    initiales,
    role,
    bio,
    linkedin,
    twitter,
    photo
  }
`