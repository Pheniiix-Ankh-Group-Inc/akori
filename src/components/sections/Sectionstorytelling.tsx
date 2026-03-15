"use client"

import { useEffect, useRef } from "react"

/**
 * SectionStorytelling — Section 3
 * 3 chapitres alternés photo / texte.
 * Effet parallax JS sur chaque photo.
 * Pattern inspiré reMarkable.
 *
 * → Remplacer chaque gradient placeholder par une vraie photo :
 *   style={{ backgroundImage: "url('/photo.jpg')" }}
 */

const CHAPTERS = [
  {
    num:  "01",
    reverse: false,
    photoClass: "ph1",
    photoBg: "linear-gradient(135deg, #141210 0%, #1c1914 50%, #0e0d0b 100%)",
    headline: (
      <>
        Un réseau bâti sur<br />
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
          la confiance et la compétence.
        </em>
      </>
    ),
    body: "Chaque membre est vérifié et présenté avec son expertise réelle. Pas un feed algorithmique — un annuaire humain, filtrable par secteur, ville et disponibilité. Les connexions qui émergent ici sont durables parce qu'elles reposent sur un socle commun.",
    link: { label: "Rejoindre le réseau →", href: "#adhesion" },
  },
  {
    num:  "02",
    reverse: true,
    photoClass: "ph2",
    photoBg: "linear-gradient(135deg, #0e1210 0%, #131a14 50%, #0c0e0b 100%)",
    headline: (
      <>
        Des événements qui<br />
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
          créent de vraies opportunités.
        </em>
      </>
    ),
    body: "Conférences, hackathons, tables rondes, formations — chaque événement AnbaChain est conçu pour produire des résultats concrets : collaborations, projets, embauches, partenariats. La billetterie est gérée via Lu.ma pour une expérience fluide.",
    link: { label: "Voir les prochains événements →", href: "#evenements" },
  },
  {
    num:  "03",
    reverse: false,
    photoClass: "ph3",
    photoBg: "linear-gradient(135deg, #100e14 0%, #17131e 50%, #0c0a10 100%)",
    headline: (
      <>
        Des ressources produites<br />
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
          par et pour la communauté.
        </em>
      </>
    ),
    body: "Rapports sectoriels, tutoriels techniques, analyses de gouvernance — tout le contenu d'AnbaChain est rédigé par des membres du réseau. Une bibliothèque vivante qui grandit avec chaque expertise qui nous rejoint.",
    link: { label: "Explorer les ressources →", href: "#ressources" },
  },
  {
    num:  "04",
    reverse: true,
    photoClass: "ph4",
    photoBg: "linear-gradient(135deg, #0e1210 0%, #131a14 50%, #0c0e0b 100%)",
    headline: (
      <>
        Des partenaires et institutions qui<br />
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
          créent de vraies opportunités.
        </em>
      </>
    ),
    body: "Conférences, hackathons, tables rondes, formations — chaque événement AnbaChain est conçu pour produire des résultats concrets : collaborations, projets, embauches, partenariats. La billetterie est gérée via Lu.ma pour une expérience fluide.",
    link: { label: "Voir les prochains événements →", href: "#partenaires" },
  },
]

function StoryChapter({
  chapter,
  index,
}: {
  chapter: (typeof CHAPTERS)[0]
  index: number
}) {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap  = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return

    const onScroll = () => {
      const rect   = wrap.getBoundingClientRect()
      const center = rect.top + rect.height / 2 - window.innerHeight / 2
      inner.style.transform = `translateY(${center * 0.35}px)`
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const isReverse = chapter.reverse
  const bgText    = isReverse ? "var(--bg-2)" : "var(--bg)"

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "90vh",
        borderTop: "1px solid var(--border)",
        direction: isReverse ? "rtl" : "ltr",
      }}
      className="story-chapter"
    >
      {/* Photo parallax */}
      <div
        ref={wrapRef}
        data-parallax
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "600px",
          direction: "ltr",
        }}
      >
        <div
          ref={innerRef}
          className="story-photo-inner"
          style={{
            position: "absolute",
            inset: "-20% 0",
            width: "100%",
            height: "140%",
            background: chapter.photoBg,
            backgroundSize: "cover",
            backgroundPosition: "center",
            willChange: "transform",
            /* ↓ PRODUCTION : backgroundImage: "url('/photos/chap-N.jpg')" */
          }}
        />
      </div>

      {/* Texte */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "6rem 5rem",
          background: bgText,
          direction: "ltr",
        }}
      >
        <div
          data-reveal
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "5rem",
            fontWeight: 200,
            color: "var(--accent)",
            opacity: 0.15,
            lineHeight: 1,
            marginBottom: "1.5rem",
          }}
        >
          {chapter.num}
        </div>

        <h3
          data-reveal
          data-delay="1"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.8rem, 2.5vw, 2.5rem)",
            fontWeight: 300,
            color: "var(--blanc)",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            marginBottom: "1.5rem",
          }}
        >
          {chapter.headline}
        </h3>

        <p
          data-reveal
          data-delay="2"
          style={{
            fontSize: "1rem",
            color: "var(--texte-2)",
            lineHeight: 1.85,
            fontWeight: 300,
            marginBottom: "2rem",
          }}
        >
          {chapter.body}
        </p>

        <a
          href={chapter.link.href}
          data-reveal
          data-delay="3"
          style={{
            fontSize: "0.82rem",
            color: "var(--accent)",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "gap 0.3s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.gap = "0.7rem")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.gap = "0.4rem")
          }
        >
          {chapter.link.label}
        </a>
      </div>
    </div>
  )
}

export function SectionStorytelling() {
  return (
    <section id="storytelling" style={{ paddingTop: "var(--pad)" }}>
      {/* Intro */}
      <div
        className="wrap"
        style={{ paddingBottom: "7rem", maxWidth: "700px" }}
      >
        <span
          data-reveal
          style={{
            display: "block",
            fontFamily: "var(--font-sans)",
            fontSize: "0.68rem",
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: "1.5rem",
          }}
        >
          Pourquoi AnbaChain
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
            fontSize: "clamp(2.5rem, 4vw, 4rem)",
          }}
        >
          Trois raisons<br />
          de{" "}
          <em style={{ fontStyle: "italic", fontWeight: 200 }}>rejoindre</em>
          <br />
          le mouvement.
        </h2>
      </div>

      {/* 3 chapitres */}
      {CHAPTERS.map((chapter, i) => (
        <StoryChapter key={chapter.num} chapter={chapter} index={i} />
      ))}

      <style>{`
        @media (max-width: 1024px) {
          .story-chapter {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
            direction: ltr !important;
          }
          .story-chapter .story-photo-inner {
            inset: 0 !important;
            height: 100% !important;
          }
          .story-chapter > div:first-child {
            min-height: 360px !important;
            direction: ltr !important;
          }
          .story-chapter > div:last-child {
            padding: 3rem 2rem !important;
            direction: ltr !important;
          }
        }
      `}</style>
    </section>
  )
}