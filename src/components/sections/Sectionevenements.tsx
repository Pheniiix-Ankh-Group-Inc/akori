"use client"

import { Button } from "@/components/ui/Button"
import type { Evenement } from "@/types"
import { EVENEMENT_TYPE_LABELS } from "@/types"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Props {
  evenements: Evenement[]
  featured:   Evenement | null
}

export function SectionEvenements({ evenements, featured }: Props) {
  return (
    <section
      id="evenements"
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
        <Button variant="ghost" href="https://lu.ma" external>
          Voir tout l'agenda Lu.ma ↗
        </Button>
      </div>

      {/* Layout 2 colonnes */}
      <div style={{ padding: "0 3rem" }} className="ev-layout-wrap">
        <div className="ev-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>

          {/* Événement vedette */}
          {featured ? (
            <div
              data-reveal
              style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden", transition: "border-color 0.3s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-h)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              {/* Bannière */}
              <div style={{ height: "260px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "2rem", background: "linear-gradient(135deg, #14120e, #1a1712)" }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(196,164,110,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
                <span style={{ display: "inline-block", padding: "0.28rem 0.8rem", borderRadius: "100px", background: "rgba(196,164,110,0.12)", border: "1px solid rgba(196,164,110,0.25)", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.75rem", position: "relative", zIndex: 1 }}>
                  {EVENEMENT_TYPE_LABELS[featured.type] ?? featured.type} · Présentiel
                </span>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", fontWeight: 700, color: "var(--blanc)", lineHeight: 1.2, position: "relative", zIndex: 1 }}>
                  {featured.titre}
                </h3>
              </div>

              {/* Corps */}
              <div style={{ padding: "2rem", background: "var(--bg-card)" }}>
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
                  {featured.lumaUrl && (
                    <Button variant="accent" href={featured.lumaUrl} external>
                      Réserver — {featured.prix} via Lu.ma
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
          )}

          {/* Liste événements */}
          <div data-reveal data-delay="1" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              {(evenements ?? []).length > 0 ? (evenements ?? []).map((ev, i) => (
                <div
                  key={ev._id}
                  style={{ display: "flex", gap: "1.25rem", padding: "1.2rem 1.5rem", borderBottom: i < evenements.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center", cursor: "pointer", transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  {/* Date box */}
                  <div style={{ flexShrink: 0, width: "44px", textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: "4px", padding: "0.5rem 0" }}>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, color: "var(--blanc)", lineHeight: 1 }}>
                      {format(new Date(ev.date), "d")}
                    </div>
                    <div style={{ fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--texte)" }}>
                      {format(new Date(ev.date), "MMM", { locale: fr })}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.87rem", fontWeight: 500, color: "var(--blanc)", marginBottom: "0.18rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ev.titre}
                    </div>
                    <div style={{ fontSize: "0.73rem", color: "var(--texte)" }}>
                      {ev.lieu ?? "En ligne"}
                    </div>
                  </div>

                  {/* Prix */}
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent)", flexShrink: 0 }}>
                    {ev.prix ?? "Gratuit"}
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