"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { Link } from "@/i18n/navigation"

export type Axis = {
  key: string
  title: string
  text: string
  link: string
  href: string
  image: { src: string; alt: string; focus: string } | null
}

/**
 * Chapitre « Ce que nous construisons » : image collante à gauche, étapes qui
 * défilent à droite (desktop). L'étape au centre de l'écran devient active et
 * son image apparaît en fondu. Le défilement reste libre et réversible ; tout
 * le texte est dans le HTML dès le rendu serveur. Sous 1280 px, chaque étape
 * affiche sa propre image et aucune n'est atténuée.
 */
export function AxesScrolly({ axes, heading, eyebrow }: { axes: Axis[]; heading: string; eyebrow: string }) {
  const [active, setActive] = useState(0)
  const steps = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    )
    steps.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  const current = axes[active]
  return (
    <div className="im-axes">
      <div className="im-axes-stage" aria-hidden="true">
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--blanc)" }}>
          {axes.map((a, i) =>
            a.image ? (
              <div key={a.key} className="im-xf" data-on={i === active}>
                <Image src={a.image.src} alt="" fill sizes="(max-width: 1279px) 0px, 58vw" style={{ objectFit: "cover", objectPosition: a.image.focus }} />
              </div>
            ) : (
              <div key={a.key} className="im-xf" data-on={i === active} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="im-t" style={{ fontSize: "clamp(8rem, 18vw, 20rem)", color: "var(--accent-light)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            ),
          )}
          <p className="im-ey" style={{ position: "absolute", left: "var(--im-pad)", bottom: "2.5rem", margin: 0, padding: "0.6rem 0.9rem", background: "var(--blanc)", color: "var(--bg)" }}>
            {String(active + 1).padStart(2, "0")} / {String(axes.length).padStart(2, "0")} · {current?.title}
          </p>
        </div>
      </div>
      <div className="im-axes-steps">
        <p className="im-ey">{eyebrow}</p>
        <h2 id="home-axes" className="im-t im-h2s" style={{ marginTop: "1.25rem" }}>
          {heading}
        </h2>
        {axes.map((a, i) => (
          <div
            key={a.key}
            ref={(el) => {
              steps.current[i] = el
            }}
            data-index={i}
            data-on={i === active}
            className="im-step"
          >
            {a.image && (
              <div className="im-step-media im-img">
                <Image src={a.image.src} alt={a.image.alt} fill sizes="(max-width: 1279px) 100vw, 1px" style={{ objectFit: "cover", objectPosition: a.image.focus }} />
              </div>
            )}
            <p className="im-ey">
              {String(i + 1).padStart(2, "0")} / {String(axes.length).padStart(2, "0")}
            </p>
            <h3 className="im-t im-h3">{a.title}</h3>
            <p className="im-p">{a.text}</p>
            <Link href={a.href} className="im-link" style={{ alignSelf: "flex-start" }}>
              {a.link}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
