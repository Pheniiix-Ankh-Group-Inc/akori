"use client"

import type { Evenement } from "@/types"
import { useState } from "react"
import { sortEventsByDate } from "@/lib/luma"
import { useTranslations } from "next-intl"

const LUMA_CALENDAR_ID = process.env.NEXT_PUBLIC_LUMA_CALENDAR_ID ?? ""

interface Props {
  evenements: Evenement[]
  featured:   Evenement | null
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
      <div style={{ padding: "0 3rem", marginBottom: "5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="label" data-reveal>{t("label")}</span>
          <h2 className="heading-md" data-reveal data-delay="1">
            {t("title.main")} <em className="text-italic">{t("title.highlight")}</em>
          </h2>
        </div>
      </div>

      {/* Embed */}
      <div style={{ padding: "0 3rem", marginBottom: "2rem" }}>
        <div style={{ overflow: "hidden" }}>
          {LUMA_CALENDAR_ID ? (
            <iframe
              src={`https://lu.ma/embed/calendar/${LUMA_CALENDAR_ID}/events?lt=dark`}
              style={{ width: "50%", height: "600px", border: "none", display: "flex"}}
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
        @media (max-width: 1024px) {
          .ev-layout { grid-template-columns: 1fr !important; }
          .ev-layout-wrap { padding: 0 1.5rem !important; }
        }
      `}</style>
    </section>
  )
}