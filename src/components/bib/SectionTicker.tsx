import { useTranslations } from "next-intl"

export function SectionTicker() {
  const t = useTranslations("Ticker")
  const items = t.raw("items") as string[]
  const doubled = [...items, ...items]

  return (
    <div className="bib-ticker" aria-hidden>
      <div className="bib-ticker-track">
        {doubled.map((item, i) => (
          <span key={i} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </div>
    </div>
  )
}
