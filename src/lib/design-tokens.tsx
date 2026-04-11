/**
 * AnbaChain Design Tokens
 */

export const colors = {
  // ── Dark ──────────────────────────────────────────────────────────────
  dk:       "#080909",
  dk2:      "#0e0f10",
  dk3:      "#161718",
  dkCard:   "#1b1c1e",

  // ── Light ─────────────────────────────────────────────────────────────
  lt:       "#fafaf8",
  lt2:      "#f2f1ee",
  ltCard:   "#ffffff",
  ltInk:    "#111210",
  ltInk2:   "#3a3833",

  // ── Accent ────────────────────────────────────────────────────────────
  gold:      "#c4975c",
  goldLt:    "#b5883d",
  goldDim:   "rgba(196, 151, 92, 0.11)",
  goldGlow:  "rgba(196, 151, 92, 0.06)",

  // ── Sémantiques ───────────────────────────────────────────────────────
  success:  "#3db870",
  danger:   "#e85555",

  // ── Texte dark ────────────────────────────────────────────────────────
  snow:     "#f0ebe3",
  snow2:    "#c5bfb5",
  muted:    "#68655f",
  muted2:   "#97918a",

  // ── Texte light ───────────────────────────────────────────────────────
  ltMuted:  "#8a8680",
  ltMuted2: "#5a5752",

  // ── Bordures ──────────────────────────────────────────────────────────
  dkLine:   "rgba(255, 255, 255, 0.065)",
  dkLineH:  "rgba(255, 255, 255, 0.14)",
  ltLine:   "rgba(0, 0, 0, 0.07)",
  ltLineH:  "rgba(0, 0, 0, 0.15)",
} as const

export type ColorKey = keyof typeof colors

// ── Gradients D3 (pour les barres et sparklines) ───────────────────────────
export const chartGradients = {
  goldBar: {
    from: "rgba(196, 151, 92, 0.85)",
    to:   "rgba(196, 151, 92, 0.18)",
  },
  greenBar: {
    from: "rgba(61, 184, 112, 0.85)",
    to:   "rgba(61, 184, 112, 0.18)",
  },
  sparkSenior: {
    line: "#b5883d",
    fill: "rgba(181, 136, 61, 0.2)",
  },
  sparkNew: {
    line: "rgba(196, 151, 92, 0.4)",
    fill: "rgba(196, 151, 92, 0.08)",
  },
} as const

// ── Typographie (références string, pour D3 axis labels) ───────────────────
export const fonts = {
  serif: "'Fraunces', Georgia, serif",
  sans:  "'DM Sans', system-ui, sans-serif",
} as const

// ── Easings (pour les animations D3 avec d3-ease) ─────────────────────────
// Correspond à cubic-bezier(0.22, 1, 0.36, 1) → approx. d3.easeExpOut
export const easing = {
  // Utilise d3.easeExpOut ou d3.easeCubicOut dans les transitions D3
  durationFast:   300,
  durationBase:   700,
  durationSlow:  1400,
  durationChart: 1600,
} as const

// ── Helper : lire une CSS variable au runtime (client uniquement) ──────────
// Utile pour D3 quand on veut rester synchronisé avec le CSS
export function getCSSVar(name: string): string {
  if (typeof window === "undefined") return ""
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

// Usage dans un composant D3 :
// const gold = getCSSVar("--color-gold") || colors.gold

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



export const NAV_LINKS = [
  { label: "mission",    hash: "mission"    },
  { label: "partners",   hash: "partners"   },
  { label: "events",     hash: "events"     },
  { label: "resources",  hash: "resources"  },
  { label: "membership", hash: "membership" },
  { label: "about",      hash: "about"      },
  { label: "fondateurs", hash: "fondateurs" },
] as const

