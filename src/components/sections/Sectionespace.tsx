import { Button } from "@/components/ui/Button"

/**
 * SectionEspace — Section 9
 * Layout 2 colonnes : features + mockup dashboard OS.
 * Identique au #espace du HTML v3.
 */

const FEATURES = [
  {
    n:     "01",
    title: "Profil professionnel complet",
    desc:  "Compétences, expériences, secteur, disponibilité pour des collaborations",
  },
  {
    n:     "02",
    title: "Annuaire complet avec filtres avancés",
    desc:  "Recherchez par secteur, expertise, ville, disponibilité",
  },
  {
    n:     "03",
    title: "Messagerie directe entre membres",
    desc:  "Connectez-vous directement avec les professionnels du réseau",
  },
  {
    n:     "04",
    title: "Tarifs préférentiels événements Lu.ma",
    desc:  "Code membre appliqué automatiquement sur tous les événements AnbaChain",
  },
  {
    n:     "05",
    title: "Bibliothèque de ressources exclusives",
    desc:  "Rapports, analyses, guides et webinars réservés aux membres",
  },
]

const MOCK_STATS = [
  { val: "24", lbl: "Connexions" },
  { val: "3",  lbl: "Événements" },
  { val: "12", lbl: "Ressources" },
]

const MOCK_AVATARS = [
  "linear-gradient(135deg,#c4a46e,#7a5c2e)",
  "linear-gradient(135deg,#4a6e5c,#2e5c3a)",
  "linear-gradient(135deg,#5c4a6e,#3a2e5c)",
  "linear-gradient(135deg,#6e5c4a,#5c3a2e)",
]

export function SectionEspace() {
  return (
    <section
      id="espace"
      style={{ padding: "var(--pad) 0", background: "var(--bg-2)" }}
    >
      <div
        style={{ padding: "0 3rem" }}
        className="esp-wrap"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.3fr",
            gap: "7rem",
            alignItems: "center",
          }}
          className="esp-layout"
        >
          {/* ── Texte ── */}
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
              Espace membre
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
                marginBottom: "1.75rem",
              }}
            >
              Votre hub{" "}
              <em style={{ fontStyle: "italic", fontWeight: 200 }}>personnel</em>
            </h2>
            <p
              data-reveal
              data-delay="2"
              style={{
                fontSize: "0.98rem",
                color: "var(--texte-2)",
                lineHeight: 1.85,
                fontWeight: 300,
                marginBottom: "1rem",
              }}
            >
              Un espace privé pour gérer votre profil, explorer le réseau et
              accéder aux ressources exclusives AnbaChain.
            </p>

            {/* Liste features */}
            <ul
              data-reveal
              data-delay="2"
              style={{
                listStyle: "none",
                borderTop: "1px solid var(--border)",
                margin: "2.5rem 0",
              }}
            >
              {FEATURES.map(({ n, title, desc }) => (
                <li
                  key={n}
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    alignItems: "flex-start",
                    padding: "1.25rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "0.85rem",
                      color: "var(--accent)",
                      opacity: 0.5,
                      flexShrink: 0,
                      width: "22px",
                      marginTop: "0.1rem",
                    }}
                  >
                    {n}
                  </span>
                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        color: "var(--blanc)",
                        marginBottom: "0.2rem",
                      }}
                    >
                      {title}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "var(--texte)" }}>
                      {desc}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div data-reveal data-delay="3">
              <Button variant="white" href="#adhesion">
                Accéder à l'espace membre
              </Button>
            </div>
          </div>

          {/* ── Mockup dashboard ── */}
          <div
            data-reveal
            data-delay="2"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "0 50px 100px rgba(0,0,0,0.55)",
            }}
          >
            {/* Barre OS */}
            <div
              style={{
                height: "42px",
                background: "rgba(255,255,255,0.025)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                padding: "0 1.25rem",
                gap: "0.45rem",
              }}
            >
              {["#ff5f57", "#ffbd2e", "#28c840"].map((color) => (
                <div
                  key={color}
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: color,
                  }}
                />
              ))}
              <div
                style={{
                  flex: 1,
                  marginLeft: "0.75rem",
                  height: "20px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "100px",
                  fontSize: "0.6rem",
                  color: "var(--texte)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 0.75rem",
                }}
              >
                app.anbachain.io/dashboard
              </div>
            </div>

            {/* Contenu */}
            <div style={{ padding: "1.5rem" }}>
              {/* Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.75rem",
                  marginBottom: "1.5rem",
                }}
              >
                {MOCK_STATS.map(({ val, lbl }) => (
                  <div
                    key={lbl}
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid var(--border)",
                      borderRadius: "4px",
                      padding: "1rem",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "1.6rem",
                        fontWeight: 200,
                        color: "var(--accent)",
                        lineHeight: 1,
                      }}
                    >
                      {val}
                    </div>
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--texte)",
                        marginTop: "0.3rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {lbl}
                    </div>
                  </div>
                ))}
              </div>

              {/* Section membres suggérés */}
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--texte)",
                  marginBottom: "0.75rem",
                }}
              >
                Membres suggérés
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {MOCK_AVATARS.map((bg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.6rem 0.75rem",
                      background: "rgba(255,255,255,0.018)",
                      borderRadius: "4px",
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: bg,
                        flexShrink: 0,
                      }}
                    />
                    {/* Lignes placeholder */}
                    <div
                      style={{
                        height: "6px",
                        borderRadius: "3px",
                        background: "rgba(255,255,255,0.06)",
                        flex: i % 2 === 0 ? 1 : 0.6,
                      }}
                    />
                    <div
                      style={{
                        height: "6px",
                        borderRadius: "3px",
                        background: "rgba(255,255,255,0.06)",
                        flex: 0.3,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .esp-layout {
            grid-template-columns: 1fr !important;
            gap: 4rem !important;
          }
          .esp-wrap { padding: 0 1.5rem !important; }
        }
      `}</style>
    </section>
  )
}