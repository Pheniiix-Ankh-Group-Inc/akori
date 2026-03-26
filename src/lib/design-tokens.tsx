/**
 * AnbaChain Design Tokens
 * Source of truth — correspondent exactement aux variables CSS du HTML v3
 */

export const COLORS = {
  bg:       '#0c0c0c',
  bg2:      '#141414',
  bgCard:   '#1a1a1a',
  border:   'rgba(255,255,255,0.07)',
  borderH:  'rgba(255,255,255,0.16)',
  blanc:    '#edeae4',
  texte:    '#7a7570',
  texte2:   '#aaa59e',
  accent:   '#c4a46e',
  accent2:  'rgba(196,164,110,0.10)',
} as const

export const FONTS = {
  serif: "'Source Serif 4', Georgia, serif",
  sans:  "'Inter', system-ui, sans-serif",
} as const


export const NAV_LINKS = [
  { label: "mission",    hash: "mission"    },
  { label: "partners",   hash: "partners"   },
  { label: "events",     hash: "events"     },
  { label: "resources",  hash: "resources"  },
  { label: "membership", hash: "membership" },
  { label: "about",      hash: "about"      },
  { label: "fondateurs", hash: "fondateurs" },
] as const