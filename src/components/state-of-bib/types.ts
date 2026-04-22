export type SobMeta = {
  dataset_version: string
  generated_at: string
  block_number: number
  source: { name: string; license: string }
  scope: { regions: string[]; countries_in_scope: number }
}

export type SobHeadline = {
  devs_active_28d: number
  ecosystems: number
  countries: number
  cities: number
  commits_lifetime: number
  snapshot_date: string
}

export type SobCountry = {
  iso_a3: string
  name: string
  region: string
  devs_active_28d: number
  commits_lifetime: number
  commits_last_12m: number
}

export type SobCity = {
  rank: number
  city: string
  country: string
  iso_a3: string
  devs_active_28d: number
}

export type SobEcosystem = {
  id: number
  name: string
  devs_recent: number
  series_devs: number[]
  series_indexed: number[]
}

export type SobEcosystemMix = {
  months: string[]
  ecosystems: SobEcosystem[]
}

export type SobCohort = {
  months: string[]
  devs_0_1y: number[]
  devs_1_2y: number[]
  devs_2y_plus: number[]
}
