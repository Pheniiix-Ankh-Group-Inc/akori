// Noms de pays et de villes localisés pour State of BIB.
//
// Les données Electric Capital arrivent en anglais. Les pays sont traduits
// à partir de leur code ISO (Intl.DisplayNames, sans liste à maintenir) ;
// les villes, à partir d'une courte table des exonymes usuels. Une ville
// absente de la table garde son nom d'origine (Lagos, Nairobi…), ce qui est
// correct pour la plupart d'entre elles.

type Lang = "fr" | "es"

/** ISO 3166-1 alpha-3 → alpha-2 pour le périmètre (Afrique + Caraïbes). */
const ISO3_TO_ISO2: Record<string, string> = {
  DZA: "DZ", AGO: "AO", BEN: "BJ", BWA: "BW", BFA: "BF", BDI: "BI", CPV: "CV", CMR: "CM", CAF: "CF",
  TCD: "TD", COM: "KM", COD: "CD", COG: "CG", CIV: "CI", DJI: "DJ", EGY: "EG", GNQ: "GQ", ERI: "ER",
  SWZ: "SZ", ETH: "ET", GAB: "GA", GMB: "GM", GHA: "GH", GIN: "GN", GNB: "GW", KEN: "KE", LSO: "LS",
  LBR: "LR", LBY: "LY", MDG: "MG", MWI: "MW", MLI: "ML", MRT: "MR", MUS: "MU", MAR: "MA", MOZ: "MZ",
  NAM: "NA", NER: "NE", NGA: "NG", RWA: "RW", STP: "ST", SEN: "SN", SYC: "SC", SLE: "SL", SOM: "SO",
  ZAF: "ZA", SSD: "SS", SDN: "SD", TZA: "TZ", TGO: "TG", TUN: "TN", UGA: "UG", ZMB: "ZM", ZWE: "ZW",
  ATG: "AG", BHS: "BS", BRB: "BB", BLZ: "BZ", CUB: "CU", DMA: "DM", DOM: "DO", GRD: "GD", GUY: "GY",
  HTI: "HT", JAM: "JM", KNA: "KN", LCA: "LC", VCT: "VC", SUR: "SR", TTO: "TT", PRI: "PR", GLP: "GP",
  MTQ: "MQ", ABW: "AW", CUW: "CW", MSR: "MS",
}

/** Villes dont le nom usuel diffère en français ou en espagnol. */
const CITY_NAMES: Record<string, Partial<Record<Lang, string>>> = {
  "Addis Ababa": { fr: "Addis-Abeba", es: "Adís Abeba" },
  Alexandria: { fr: "Alexandrie", es: "Alejandría" },
  Algiers: { fr: "Alger", es: "Argel" },
  Cairo: { fr: "Le Caire", es: "El Cairo" },
  "Cape Town": { fr: "Le Cap", es: "Ciudad del Cabo" },
  "Dar es Salaam": { fr: "Dar es Salam", es: "Dar es-Salam" },
  Fez: { fr: "Fès" },
  Havana: { fr: "La Havane", es: "La Habana" },
  Khartoum: { es: "Jartum" },
  Mogadishu: { fr: "Mogadiscio", es: "Mogadiscio" },
  "Port Louis": { fr: "Port-Louis" },
  "Port of Spain": { fr: "Port-d'Espagne", es: "Puerto España" },
  "Santo Domingo": { fr: "Saint-Domingue" },
  Tangier: { fr: "Tanger", es: "Tánger" },
  Tripoli: { es: "Trípoli" },
  Tunis: { es: "Túnez" },
  Yaounde: { fr: "Yaoundé", es: "Yaundé" },
  "N'Djamena": { es: "Yamena" },
  Marrakesh: { fr: "Marrakech", es: "Marrakech" },
  Kinshasa: {},
  Johannesburg: { es: "Johannesburgo" },
}

const displayNames = new Map<string, Intl.DisplayNames | null>()

function regionNames(locale: string): Intl.DisplayNames | null {
  if (!displayNames.has(locale)) {
    try {
      displayNames.set(locale, new Intl.DisplayNames([locale], { type: "region", fallback: "none" }))
    } catch {
      displayNames.set(locale, null)
    }
  }
  return displayNames.get(locale) ?? null
}

function lang(locale: string): Lang | null {
  const l = locale.slice(0, 2)
  return l === "fr" || l === "es" ? l : null
}

/** Nom du pays dans la langue de la page ; nom d'origine si inconnu ou en anglais. */
export function countryName(iso3: string | null | undefined, fallback: string, locale: string): string {
  if (!lang(locale) || !iso3) return fallback
  const iso2 = ISO3_TO_ISO2[iso3.toUpperCase()]
  if (!iso2) return fallback
  return regionNames(locale)?.of(iso2) ?? fallback
}

/** Nom de la ville dans la langue de la page ; nom d'origine sinon. */
export function cityName(city: string, locale: string): string {
  const l = lang(locale)
  return (l && CITY_NAMES[city]?.[l]) || city
}

interface SnapshotGeo {
  countryMap: { iso_a3: string; name: string }[]
  topCities: { city: string; country: string; iso_a3?: string }[]
}

/** Copie de l'instantané avec pays et villes traduits (les codes ISO ne changent pas). */
export function localizeSnapshot<T extends SnapshotGeo>(snapshot: T, locale: string): T {
  if (!lang(locale)) return snapshot
  return {
    ...snapshot,
    countryMap: snapshot.countryMap.map((c) => ({ ...c, name: countryName(c.iso_a3, c.name, locale) })),
    topCities: snapshot.topCities.map((c) => ({
      ...c,
      city: cityName(c.city, locale),
      country: countryName(c.iso_a3, c.country, locale),
    })),
  }
}
