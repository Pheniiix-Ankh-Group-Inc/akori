import { useTranslations } from "next-intl"

export function SectionMarquee() {
  const t = useTranslations("Marquee")
  const items = [t.raw("item1"), t.raw("item2"), t.raw("item3"), t.raw("item4")] as string[]
  const doubled = [...items, ...items]

  return (
    <div className="bib-marquee" aria-hidden>
      <div className="bib-marquee-track">
        {doubled.map((item, i) => (
          <span key={i}>
            <span dangerouslySetInnerHTML={{ __html: item }} />
            <span className="dot" />
          </span>
        ))}
      </div>
    </div>
  )
}
