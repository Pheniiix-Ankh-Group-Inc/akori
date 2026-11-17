"use client"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"
import { DEFAULT_FILTERS, METRICS, REGIONS, parseFilters, serializeFilters, type SobFilters } from "@/lib/sob/explore"

interface Ctx {
  filters: SobFilters
  update: (patch: Partial<SobFilters>) => void
  reset: () => void
  months: string[]
  reducedMotion: boolean
}

const ExplorerContext = createContext<Ctx | null>(null)

export function useSobExplorer(): Ctx {
  const ctx = useContext(ExplorerContext)
  if (!ctx) throw new Error("useSobExplorer hors de SobExplorerProvider")
  return ctx
}

const QUERY = "(prefers-reduced-motion: reduce)"
function subscribeMotion(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const mq = window.matchMedia(QUERY)
  mq.addEventListener?.("change", cb)
  return () => mq.removeEventListener?.("change", cb)
}
/** Préférence « mouvement réduit » (true côté serveur : aucune animation par défaut). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(QUERY).matches : false),
    () => true,
  )
}

/**
 * État léger partagé par les visualisations State of BIB. Les filtres
 * importants sont reflétés dans l'URL (history.replaceState : aucun
 * rechargement, aucune requête serveur) pour pouvoir partager une vue.
 */
export function SobExplorerProvider({
  children,
  months,
  countries,
  ecosystems,
}: {
  children: React.ReactNode
  months: string[]
  countries: string[]
  ecosystems: number[]
}) {
  const [filters, setFilters] = useState<SobFilters>(DEFAULT_FILTERS)
  const reducedMotion = useReducedMotion()
  const known = useMemo(() => ({ countries: new Set(countries), ecosystems: new Set(ecosystems), months }), [countries, ecosystems, months])
  const hydrated = useRef(false)

  // Lecture de l'URL au montage (la page reste statique côté serveur).
  useEffect(() => {
    const parsed = parseFilters(new URLSearchParams(window.location.search), known)
    hydrated.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation unique avec l'URL au montage
    setFilters(parsed)
  }, [known])

  useEffect(() => {
    if (!hydrated.current) return
    const qs = serializeFilters(filters).toString()
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", url)
    }
  }, [filters])

  const update = useCallback((patch: Partial<SobFilters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch }
      if (!next.country) next.compare = null
      if (next.compare && next.compare === next.country) next.compare = null
      if (next.from && next.to && next.from > next.to) [next.from, next.to] = [next.to, next.from]
      return next
    })
  }, [])
  const reset = useCallback(() => setFilters({ ...DEFAULT_FILTERS, cohorts: [...DEFAULT_FILTERS.cohorts] }), [])

  const value = useMemo(() => ({ filters, update, reset, months, reducedMotion }), [filters, update, reset, months, reducedMotion])
  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>
}

/** Barre de filtres partagés (région, métrique, période), réinitialisation, lien. */
export function SobFilterBar({ monthLabel }: { monthLabel: (m: string) => string }) {
  const t = useTranslations("SobExplore.filters")
  const { filters, update, reset, months } = useSobExplorer()
  const [copied, setCopied] = useState(false)
  const activeCount =
    Number(filters.region !== "all") +
    Number(filters.metric !== DEFAULT_FILTERS.metric) +
    Number(!!filters.country) +
    Number(filters.ecosystem !== null) +
    Number(!!filters.from || !!filters.to)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="sob-filterbar" aria-labelledby="sob-filters-title">
      <h2 id="sob-filters-title" className="sr-only">{t("title")}</h2>
      <div className="sob-filterbar-row">
        <label className="sob-control">
          <span>{t("region")}</span>
          <select className="ed-input" value={filters.region} onChange={(e) => update({ region: e.target.value as SobFilters["region"] })}>
            {REGIONS.map((r) => <option key={r} value={r}>{t(`regions.${r}`)}</option>)}
          </select>
        </label>
        <label className="sob-control">
          <span>{t("metric")}</span>
          <select className="ed-input" value={filters.metric} onChange={(e) => update({ metric: e.target.value as SobFilters["metric"] })}>
            {METRICS.map((m) => <option key={m} value={m}>{t(`metrics.${m}`)}</option>)}
          </select>
        </label>
        <fieldset className="sob-control sob-period">
          <legend>{t("period")}</legend>
          <label>
            <span className="sr-only">{t("from")}</span>
            <select className="ed-input" value={filters.from ?? months[0] ?? ""} onChange={(e) => update({ from: e.target.value === months[0] ? null : e.target.value })} aria-label={t("from")}>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </label>
          <span aria-hidden="true">→</span>
          <label>
            <span className="sr-only">{t("to")}</span>
            <select className="ed-input" value={filters.to ?? months[months.length - 1] ?? ""} onChange={(e) => update({ to: e.target.value === months[months.length - 1] ? null : e.target.value })} aria-label={t("to")}>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </label>
        </fieldset>
        <div className="sob-filterbar-actions">
          <span className="ed-muted" aria-live="polite">{t("active", { n: activeCount })}</span>
          <button type="button" className="ed-btn ed-btn-line" onClick={reset} disabled={activeCount === 0}>{t("reset")}</button>
          <button type="button" className="ed-btn ed-btn-line" onClick={copy}>
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      </div>
    </section>
  )
}
