"use client"

import  { Button }  from "@/components/ui/Button"
import type { Ressource } from "@/types"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useTranslations } from "next-intl"

interface Props {
  ressources: Ressource[] | null
}

export function SectionRessources({ ressources }: Props) {
  const t = useTranslations("sectionRessources")

  const data = ressources ?? []
  const featured = data.find((r) => r.featured) ?? data[0] ?? null
  const rest = data.filter((r) => r._id !== featured?._id).slice(0, 2)

  return (
    <section
      id="resources"
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
        <Button variant="ghost-lt" href="/ressources">
          {t("cta")}
        </Button>
      </div>

      {/* Grille */}
      <div style={{ padding: "0 3rem" }}>
        {data.length === 0 ? (
          <p style={{ fontSize: "0.86rem", color: "var(--texte)", textAlign: "center", padding: "4rem 0" }}>
            {t("empty")}
          </p>
        ) : (
          <div
            className="res-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr",
              border: "1px solid var(--border)",
              borderRight: "none",
              borderBottom: "none",
            }}
          >
            {/* Featured */}
            {featured && (
              <div
                data-reveal
                style={{
                  gridRow: rest.length > 0 ? "1 / 3" : "1",
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  padding: "3rem",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "1.5rem" }}>
                  {t(`categories.${featured.categorie}`)}
                </span>

                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", fontWeight: 700, color: "var(--blanc)", lineHeight: 1.2, flex: 1 }}>
                  {featured.titre}
                </h3>

                {featured.extrait && (
                  <p style={{ fontSize: "0.88rem", color: "var(--texte-2)" }}>
                    {featured.extrait}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem" }}>
                  <span>{featured.auteur}</span>
                  <span>
                    {featured.publishedAt
                      ? format(new Date(featured.publishedAt), "d MMM yyyy", { locale: fr })
                      : ""}
                    {featured.tempsLecture
                      ? ` · ${t("readingTime", { minutes: featured.tempsLecture })}`
                      : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Rest */}
            {rest.map((r, i) => (
              <div key={r._id}>
                <span>{t(`categories.${r.categorie}`)}</span>
                <h3>{r.titre}</h3>
                <span>
                  {r.tempsLecture
                    ? t("readingTime", { minutes: r.tempsLecture })
                    : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}