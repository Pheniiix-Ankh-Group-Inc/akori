"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"

/**
 * SectionCommunaute — Section 11
 * Photo pleine largeur + overlay.
 * Newsletter form + liens sociaux.
 * Identique au #communaute du HTML v3.
 *
 * → Remplacer le gradient par backgroundImage: "url('/event-photo.jpg')"
 */

const SOCIAL_LINKS = [
  { label: " Instagram",   href: "https://www.instagram.com/anbachain" },
  { label: "in LinkedIn",  href: "https://www.linkedin.com/in/anbachain" },
]

export function SectionCommunaute() {
  const bgRef   = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLElement>(null)
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  // Parallax lent
  useEffect(() => {
    const bg   = bgRef.current
    const wrap = wrapRef.current
    if (!bg || !wrap) return

    const onScroll = () => {
      const rect   = wrap.getBoundingClientRect()
      const center = rect.top + rect.height / 2 - window.innerHeight / 2
      bg.style.transform = `translateY(${center * 0.18}px)`
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])


  // Newsletter form submit
  async function handleSubmit() {
    if(!email || status === "loading") return

    setStatus("loading")
    setMessage("")

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })


      const data = await res.json()
      if (data.success) {
        setStatus("success")
        setMessage("Inscription confirmée. Verifiez votre boîte mail !")
      } else {
        setStatus("error")
        setMessage(data.message || "Une erreur est survenue.")
      }
    } catch (err) {
      setStatus("error")
      setMessage("Erreur réseau. Reessayez plus tard.")
      console.error("[Newsletter] request error:", err)
    }
  }

  return (
    <section
      ref={wrapRef}
      id="communaute"
      style={{
        position: "relative",
        padding: "var(--pad) 0",
        overflow: "hidden",
      }}
    >
      {/* ── Photo background + overlay ── */}
      <div
        ref={bgRef}
        style={{
          position: "absolute",
          inset: 0,
          /* ↓ PRODUCTION : backgroundImage: "url('/event-photo.jpg')" */
          background:
            "linear-gradient(135deg, #0c0a07 0%, #12100d 50%, #0c0c0b 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(12,12,12,0.88)",
          }}
        />
      </div>

      {/* ── Contenu centré ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "680px",
          margin: "0 auto",
          textAlign: "center",
          padding: "0 3rem",
        }}
      >
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
          Rejoindre le mouvement
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
            fontSize: "clamp(2.8rem, 5vw, 5.5rem)",
            marginBottom: "1.5rem",
          }}
        >
          Le futur s'écrit<br />
          <em style={{ fontStyle: "italic", fontWeight: 200 }}>maintenant.</em>
        </h2>

        <p
          data-reveal
          data-delay="2"
          style={{
            fontSize: "1.05rem",
            color: "var(--texte-2)",
            fontWeight: 300,
            lineHeight: 1.8,
            maxWidth: "500px",
            margin: "0 auto 3rem",
          }}
        >
          Recevez les analyses, actualités et invitations en avant-première.
          Rejoignez plus des professionnels qui construisent l'économie de demain.
        </p>

        {/* Newsletter form */}
        <div>  
          {status === "success" ? (
            <p style={{ color: "var(--accent)", fontWeight: 500 }}>{message}</p>
          ) : (
        <div
          data-reveal
          data-delay="3"
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
            maxWidth: "420px",
            margin: "0 auto 3rem",
          }}
        >
          <input
            type="email"
            placeholder="Votre adresse email"
            value={email}
            style={{
              flex: 1,
              padding: "0.8rem 1.4rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border)",
              borderRadius: "100px",
              color: "var(--blanc)",
              fontFamily: "var(--font-sans)",
              fontSize: "0.88rem",
              outline: "none",
            }}
            onFocus={(e) =>
              ((e.target as HTMLInputElement).style.borderColor =
                "rgba(255,255,255,0.22)")
            }
            onBlur={(e) =>
              ((e.target as HTMLInputElement).style.borderColor = "var(--border)")
            }
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <Button variant="white" onClick={handleSubmit}>
            {status === "loading" ? "Envoi en cours..." : "S'inscrire"}
          </Button>
        </div>
          )}
          {status === "error" && (
            <p style={{ color: "var(--error)", fontWeight: 500 }}>{message}</p>
          )}
         </div>

        {/* Réseaux sociaux */}
        <div
          data-reveal
          data-delay="4"
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {SOCIAL_LINKS.map(({ label, href }) => (
            <Button key={label} variant="ghost" href={href}>
              {label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}
