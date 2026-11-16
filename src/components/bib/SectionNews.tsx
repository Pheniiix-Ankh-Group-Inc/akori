"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"

const ITEMS = ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10", "n11", "n12"] as const
type Filter = "all" | "chain" | "leader" | "country"

export function SectionNews() {
  const t = useTranslations("News")
  const [filter, setFilter] = useState<Filter>("all")

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "chain", label: t("filterChain") },
    { key: "leader", label: t("filterLeader") },
    { key: "country", label: t("filterCountry") },
  ]

  return (
    <section className="bib-news" data-section="09" data-title="THE DISPATCH">
      <div className="bib-news-head">
        <div>
          <div className="bib-eyebrow">{t("eyebrow")}</div>
          <h2 className="bib-news-title" dangerouslySetInnerHTML={{ __html: t.raw("title") }} />
        </div>
        <div className="bib-news-filter">
          {filters.map(f => (
            <button
              key={f.key}
              type="button"
              className={filter === f.key ? "active" : ""}
              onClick={() => setFilter(f.key)}
              data-hover
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bib-news-feed">
        {ITEMS.map((key) => {
          const cat = t(`items.${key}.cat`) as "chain" | "leader" | "country"
          const hidden = filter !== "all" && filter !== cat
          return (
            <div key={key} className={`bib-news-row${hidden ? " hidden" : ""}`}>
              <span className="bib-news-date">{t(`items.${key}.date`)}</span>
              <span className={`bib-news-tag ${cat}`}>{t(`items.${key}.tag`)}</span>
              <h3
                className="bib-news-headline"
                dangerouslySetInnerHTML={{ __html: t.raw(`items.${key}.headline`) }}
              />
              <span className="bib-news-source">{t(`items.${key}.source`)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
