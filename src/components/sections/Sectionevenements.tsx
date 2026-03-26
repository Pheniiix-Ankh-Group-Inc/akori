"use client"
import type { Evenement } from "@/types"
import { useState } from "react"
import { sortEventsByDate } from "@/lib/luma"
import { useTranslations } from "next-intl"

const LUMA_CALENDAR_ID = process.env.NEXT_PUBLIC_LUMA_CALENDAR_ID ?? ""

interface Props {
  evenements: Evenement[]
  featured: Evenement | null
}

type ViewMode = "list" | "embed"

export function SectionEvenements({ evenements, featured }: Props) {
  const t = useTranslations("sectionEvenements")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const sortedEvents = sortEventsByDate(evenements ?? [])

  return (
    <section
      id="events"
      style={{ padding: "var(--pad) 0", background: "var(--bg)" }}
    >
      {/* Top */}
      <div className="ev-header">
        <div>
          <span className="label" data-reveal>{t("label")}</span>
          <h2 className="heading-md" data-reveal data-delay="1">
            {t("title.main")} <em className="text-italic">{t("title.highlight")}</em>
          </h2>
        </div>
      </div>

      {/* Embed */}
      <div className="ev-embed-wrap">
        <div style={{ overflow: "hidden" }}>
          {LUMA_CALENDAR_ID ? (
            <iframe
              src={`https://lu.ma/embed/calendar/${LUMA_CALENDAR_ID}/events?lt=dark`}
              className="ev-iframe"
              aria-hidden="false"
              tabIndex={0}
              title={t("iframe.title")}
            />
          ) : (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.86rem", color: "var(--texte)" }}>
                {t("empty")}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* --- Mobile first (base) --- */
        .ev-header {
          padding: 0 1.5rem;
          margin-bottom: 3rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .ev-embed-wrap {
          padding: 0 1.5rem;
          margin-bottom: 2rem;
        }

        .ev-iframe {
          width: 100%;
          height: 480px;
          border: none;
          display: block;
        }

        /* --- Tablet (≥ 768px) --- */
        @media (min-width: 768px) {
          .ev-iframe {
            height: 560px;
          }
        }

        /* --- Desktop (≥ 1024px) --- */
        @media (min-width: 1024px) {
          .ev-header {
            padding: 0 3rem;
            margin-bottom: 5rem;
          }

          .ev-embed-wrap {
            padding: 0 3rem;
          }

          .ev-iframe {
            width: 50%;
            height: 600px;
          }
        }
      `}</style>
    </section>
  )
}