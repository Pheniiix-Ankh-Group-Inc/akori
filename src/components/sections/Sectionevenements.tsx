"use client";

import { Button } from "@/components/ui/Button"

/**
 * SectionEvenements — Section 6
 * Layout 2 colonnes : événement vedette + liste Lu.ma.
 * Identique au #evenements du HTML v3.
 *
 * INTÉGRATION LU.MA EN PRODUCTION :
 * A) Liste événements → remplacer .luma-list par <iframe>
 *    src="https://lu.ma/embed/calendar/cal-VOTRE_ID/events"
 *    width="100%" height="480" frameborder="0"
 *
 * B) Bouton réservation → ajouter data-luma-action="checkout"
 *    et importer le script Lu.ma checkout
 */

const LUMA_EVENTS = [
  { day: "22", mon: "Fév", name: "DeFi et inclusion financière en Afrique", venue: "🎙 Webinar · En ligne", price: "Gratuit" },
  { day: "05", mon: "Mar", name: "Hackathon : Santé & Blockchain", venue: "💻 48h · En ligne", price: "Gratuit" },
  { day: "15", mon: "Mar", name: "AfroChain Summit 2026", venue: "🏛 Conférence · Montréal", price: "75 $" },
  { day: "18", mon: "Avr", name: "Table ronde : Gouvernance & politiques", venue: "🤝 Networking · Paris", price: "35 $" },
  { day: "10", mon: "Mai", name: "Workshop : Smart Contracts pour entrepreneurs", venue: "📚 Formation · Toronto", price: "50 $" },
]

export function SectionEvenements() {
  return (
    <section
      id="evenements"
      style={{ padding: "var(--pad) 0", background: "var(--bg)" }}
    >
      {/* ── Top ── */}
      <div
        style={{
          padding: "0 3rem",
          marginBottom: "5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <span
            data-reveal
            style={{
              display: "block",
              fontSize: "0.68rem",
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "1.5rem",
            }}
          >
            Agenda
          </span>
          <h2
            data-reveal
            data-delay="1"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 200,
              color: "var(--blanc)",
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
              fontSize: "clamp(2rem, 3.5vw, 3.5rem)",
            }}
          >
            Prochains{" "}
            <em style={{ fontStyle: "italic", fontWeight: 200 }}>événements</em>
          </h2>
        </div>
        <Button variant="ghost" href="https://lu.ma/[votre-organisation]" external>
          Voir tout l'agenda Lu.ma ↗
        </Button>
      </div>

      {/* ── Layout 2 colonnes ── */}
      <div
        style={{ padding: "0 3rem" }}
        className="ev-layout-wrap"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            alignItems: "start",
          }}
          className="ev-layout"
        >
          {/* Événement vedette */}
          <div
            data-reveal
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              overflow: "hidden",
              transition: "border-color 0.3s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-h)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = "var(--border)")
            }
          >
            {/* Bannière */}
            <div
              style={{
                height: "260px",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "2rem",
                background: "linear-gradient(135deg, #14120e, #1a1712)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "radial-gradient(rgba(196,164,110,0.05) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <span
                style={{
                  display: "inline-block",
                  padding: "0.28rem 0.8rem",
                  borderRadius: "100px",
                  background: "rgba(196,164,110,0.12)",
                  border: "1px solid rgba(196,164,110,0.25)",
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  marginBottom: "0.75rem",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                Conférence · Présentiel
              </span>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "var(--blanc)",
                  lineHeight: 1.2,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                AfroChain Summit 2026<br />Blockchain & Communautés
              </h3>
            </div>

            {/* Corps */}
            <div style={{ padding: "2rem", background: "var(--bg-card)" }}>
              <div
                style={{
                  display: "flex",
                  gap: "1.5rem",
                  fontSize: "0.8rem",
                  color: "var(--texte)",
                  marginBottom: "1.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span>📅 15 Mars 2026</span>
                <span>📍 Montréal, QC</span>
                <span>👥 250 places</span>
              </div>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--texte-2)",
                  lineHeight: 1.75,
                  fontWeight: 300,
                  marginBottom: "1.75rem",
                }}
              >
                Une journée de conférences, tables rondes et networking autour des
                applications blockchain dans les secteurs prioritaires. Intervenants
                confirmés de 6 pays.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {/* En production : ajouter data-luma-action="checkout" */}
                <Button variant="accent" href="https://lu.ma/[url-event]" external>
                  Réserver — 75 $ via Lu.ma
                </Button>
                <Button variant="ghost" href="#">Détails</Button>
              </div>
            </div>
          </div>

          {/* Widget Lu.ma */}
          <div data-reveal data-delay="1" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "1rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--blanc)",
                }}
              >
                Tous les événements
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.68rem",
                  color: "var(--texte)",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#FF6B4A",
                    display: "inline-block",
                  }}
                />
                Powered by Lu.ma
              </div>
            </div>

            {/* ── Liste Lu.ma placeholder ──
                PRODUCTION : remplacer ce div par l'iframe Lu.ma :
                <iframe
                  src="https://lu.ma/embed/calendar/cal-XXXXX/events"
                  width="100%" height="480" frameborder="0"
                  style="border:none;"
                />
            */}
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                overflow: "hidden",
                background: "var(--bg-card)",
              }}
            >
              {LUMA_EVENTS.map(({ day, mon, name, venue, price }, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "1.25rem",
                    padding: "1.2rem 1.5rem",
                    borderBottom:
                      i < LUMA_EVENTS.length - 1 ? "1px solid var(--border)" : "none",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.02)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "")
                  }
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: "44px",
                      textAlign: "center",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "4px",
                      padding: "0.5rem 0",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: "var(--blanc)",
                        lineHeight: 1,
                      }}
                    >
                      {day}
                    </div>
                    <div
                      style={{
                        fontSize: "0.58rem",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--texte)",
                      }}
                    >
                      {mon}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.87rem",
                        fontWeight: 500,
                        color: "var(--blanc)",
                        marginBottom: "0.18rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {name}
                    </div>
                    <div style={{ fontSize: "0.73rem", color: "var(--texte)" }}>
                      {venue}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    {price}
                  </div>
                </div>
              ))}

              <div
                style={{
                  padding: "1rem 1.5rem",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "0.7rem", color: "var(--texte)" }}>
                  Billetterie gérée par{" "}
                  <span style={{ color: "#FF6B4A", fontWeight: 600 }}>Lu.ma</span>
                </span>
                <Button variant="ghost" href="https://lu.ma/[org]" external>
                  Ouvrir Lu.ma ↗
                </Button>
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