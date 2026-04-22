import { useTranslations } from "next-intl"

const BLOCKS = [
  { key: "b1", past: true },
  { key: "b2", past: true },
  { key: "b3", past: true },
  { key: "b4", past: true },
  { key: "b5", past: true },
  { key: "b6", past: false },
  { key: "b7", past: false },
] as const

export function SectionLedger() {
  const t = useTranslations("Ledger")

  return (
    <section className="bib-ledger" data-section="05" data-title="ON THE LEDGER">
      <div className="bib-ledger-head">
        <div>
          <div className="bib-eyebrow">{t("eyebrow")}</div>
          <h2 className="bib-ledger-title" dangerouslySetInnerHTML={{ __html: t.raw("title") }} />
        </div>
        <p className="bib-ledger-intro">{t("intro")}</p>
      </div>

      <div className="bib-ledger-track">
        {BLOCKS.map(({ key, past }) => (
          <div key={key} className={`bib-ledger-block${past ? " past" : ""}`}>
            <div className="bib-ledger-year">
              <em>{t(`blocks.${key}.year`)}</em>
            </div>
            <div
              className="bib-ledger-block-num"
              dangerouslySetInnerHTML={{ __html: t.raw(`blocks.${key}.block`) }}
            />
            <h3
              className="bib-ledger-event-title"
              dangerouslySetInnerHTML={{ __html: t.raw(`blocks.${key}.title`) }}
            />
            <p className="bib-ledger-event-text">{t(`blocks.${key}.text`)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
