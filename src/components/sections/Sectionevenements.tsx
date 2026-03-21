"use client"

import { Button } from "@/components/ui/Button"
import type { Evenement } from "@/types"
import { EVENEMENT_TYPE_LABELS } from "@/types"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useState } from "react"
import { sortEventsByDate } from "@/lib/luma"

// Ton ID de calendrier Lu.ma — visible dans ton URL lu.ma/calendar/[ID]
const LUMA_CALENDAR_ID = process.env.NEXT_PUBLIC_LUMA_CALENDAR_ID ?? ""

interface Props {
  evenements: Evenement[]
  featured:   Evenement | null
}

type ViewMode = "list" | "embed"

export function SectionEvenements({ evenements, featured }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  // Tri automatique : futurs en premier
  const sortedEvents = sortEventsByDate(evenements ?? [])

  return (
    <section
      id="events"
      style={{ padding: "var(--pad) 0", background: "var(--bg)" }}
    >
      {/* Top */}
      <div style={{ padding: "0 3rem", marginBottom: "5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="label" data-reveal>Agenda</span>
          <h2 className="heading-md" data-reveal data-delay="1">
            Prochains <em className="text-italic">événements</em>
          </h2>
        </div>

        {/* Toggle list / embed */}
        {/* <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={() => setViewMode("list")}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "100px",
              border: "1px solid var(--border)",
              background: viewMode === "list" ? "rgba(196,164,110,0.1)" : "transparent",
              color: viewMode === "list" ? "var(--accent)" : "var(--texte)",
              fontSize: "0.75rem",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              transition: "all 0.2s",
            }}
          >
            Liste
          </button>
          <button
            onClick={() => setViewMode("embed")}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "100px",
              border: "1px solid var(--border)",
              background: viewMode === "embed" ? "rgba(196,164,110,0.1)" : "transparent",
              color: viewMode === "embed" ? "var(--accent)" : "var(--texte)",
              fontSize: "0.75rem",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              transition: "all 0.2s",
            }}
          >
            Calendrier Lu.ma
          </button>
          <Button variant="ghost" href="https://lu.ma" external>
            Voir tout ↗
          </Button>
        </div> */}
      </div>

      {/* ── Vue Embed Lu.ma ── */}
      {/* {viewMode === "embed" && ( */}
        <div style={{ padding: "0 3rem", marginBottom: "2rem" }}>
          <div style={{ overflow: "hidden" }}>
            {LUMA_CALENDAR_ID ? (
              <iframe
                src={`https://lu.ma/embed/calendar/${LUMA_CALENDAR_ID}/events?lt=dark`}
                style={{ width: "50%", height: "600px", border: "none", display: "flex"}}
                aria-hidden="false"
                tabIndex={0}
                title="Calendrier des événements AnbaChain"
              />
            ) : (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.86rem", color: "var(--texte)" }}>
                  Pas<code>d'evenements</code>
                </p>
              </div>
            )}
          </div>
        </div>
      {/* )} */}

      {/* ── Vue Liste ── */}
      {/* {viewMode === "list" && (
        <div style={{ padding: "0 3rem" }} className="ev-layout-wrap">
          <div className="ev-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}> */}

            {/* Événement vedette */}
            {/* {featured ? (
              <div
                data-reveal
                style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden", transition: "border-color 0.3s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-h)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              > */}
                {/* Bannière */}
                {/* <div style={{ height: "260px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "2rem", background: "linear-gradient(135deg, #14120e, #1a1712)" }}>
                  <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(196,164,110,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
                  <span style={{ display: "inline-block", padding: "0.28rem 0.8rem", borderRadius: "100px", background: "rgba(196,164,110,0.12)", border: "1px solid rgba(196,164,110,0.25)", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.75rem", position: "relative", zIndex: 1 }}>
                    {EVENEMENT_TYPE_LABELS[featured.type] ?? featured.type} · Présentiel
                  </span>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", fontWeight: 700, color: "var(--blanc)", lineHeight: 1.2, position: "relative", zIndex: 1 }}>
                    {featured.titre}
                  </h3>
                </div> */}

                {/* Corps */}
                {/* <div style={{ padding: "2rem", background: "var(--bg-card)" }}>
                  <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.8rem", color: "var(--texte)", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                    {featured.date && (
                      <span>📅 {format(new Date(featured.date), "d MMMM yyyy", { locale: fr })}</span>
                    )}
                    {featured.lieu && <span>📍 {featured.lieu}</span>}
                  </div>
                  {featured.description && (
                    <p style={{ fontSize: "0.9rem", color: "var(--texte-2)", lineHeight: 1.75, fontWeight: 300, marginBottom: "1.75rem" }}>
                      {featured.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    {featured.lumaUrl ? (
                      <Button variant="accent" href={featured.lumaUrl} external>
                        S'inscrire — {featured.prix ?? "Gratuit"} via Lu.ma
                      </Button>
                    ) : (
                      <Button variant="accent" href="https://lu.ma" external>
                        S'inscrire via Lu.ma
                      </Button>
                    )}
                    <Button variant="ghost" href="#">Détails</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "3rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: "0.86rem", color: "var(--texte)" }}>Aucun événement vedette</p>
              </div>
            )} */}

            {/* Liste événements triés */}
            {/* <div data-reveal data-delay="1" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", fontWeight: 700, color: "var(--blanc)" }}>
                  Tous les événements
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.68rem", color: "var(--texte)" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#FF6B4A", display: "inline-block" }} />
                  Powered by Lu.ma
                </div>
              </div>

              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden", background: "var(--bg-card)" }}>
                {sortedEvents.length > 0 ? sortedEvents.map((ev, i) => (
                  <div
                    key={ev._id}
                    style={{ display: "flex", gap: "1.25rem", padding: "1.2rem 1.5rem", borderBottom: i < sortedEvents.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center", cursor: "pointer", transition: "background 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >

                    {/* Date box */}
                    {/* <div style={{ flexShrink: 0, width: "44px", textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: "4px", padding: "0.5rem 0" }}>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, color: "var(--blanc)", lineHeight: 1 }}>
                        {format(new Date(ev.date), "d")}
                      </div>
                      <div style={{ fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--texte)" }}>
                        {format(new Date(ev.date), "MMM", { locale: fr })}
                      </div>
                    </div> */}

                    {/* Info */}
                    {/* <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.87rem", fontWeight: 500, color: "var(--blanc)", marginBottom: "0.18rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ev.titre}
                      </div>
                      <div style={{ fontSize: "0.73rem", color: "var(--texte)" }}>
                        {ev.lieu ?? "En ligne"}
                      </div>
                    </div> */}

                    {/* Bouton S'inscrire */}
                    {/* <div style={{ flexShrink: 0 }}>
                      {ev.lumaUrl ? (
                        <a
                          href={ev.lumaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--accent)", padding: "0.3rem 0.8rem", border: "1px solid rgba(196,164,110,0.3)", borderRadius: "100px", transition: "all 0.2s", whiteSpace: "nowrap" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(196,164,110,0.1)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          S'inscrire →
                        </a>
                      ) : (
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent)" }}>
                          {ev.prix ?? "Gratuit"}
                        </span>
                      )}
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: "2rem", textAlign: "center" }}>
                    <p style={{ fontSize: "0.86rem", color: "var(--texte)" }}>Aucun événement à venir</p>
                  </div>
                )}

                <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--texte)" }}>
                    Billetterie gérée par <span style={{ color: "#FF6B4A", fontWeight: 600 }}>Lu.ma</span>
                  </span>
                  <Button variant="ghost" href="https://lu.ma" external>Ouvrir Lu.ma ↗</Button>
                </div>
              </div>
            </div>
          </div>
        </div> */}
      {/* )} */}

      <style>{`
        @media (max-width: 1024px) {
          .ev-layout { grid-template-columns: 1fr !important; }
          .ev-layout-wrap { padding: 0 1.5rem !important; }
        }
      `}</style>
    </section>
  )
}