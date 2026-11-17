/**
 * Règle éditoriale : sur le site public, les fournisseurs de données State of
 * BIB, leurs jeux de données et leurs licences ne sont nommés que dans la page
 * légale « Données, méthodologie et sources ». Ce motif sert aux contrôles
 * automatiques (analyses IA, tests des traductions).
 */
export const SOB_PROVIDER_PATTERN = /electric\s*capital|open\s*dev\s*data|opendevdata|developerreport|\bCC[\s-]?BY\b|creative\s*commons|natural\s*earth/i

export const mentionsSobProvider = (text: string): boolean => SOB_PROVIDER_PATTERN.test(text)
