"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/Button"
import { SocialLink, type SocialKey } from "@/components/ui/SocialLinks"

const SOCIAL_LINKS: { key: SocialKey; href: string }[] = [
  { key: "instagram", href: "https://www.instagram.com/anbachain"   },
  { key: "linkedin",  href: "https://www.linkedin.com/in/anbachain" },
]

export function SectionCommunaute() {
  const t = useTranslations("sectionCommunaute")
  const bgRef   = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLElement>(null)
  const [email, setEmail]   = useState("")
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
    if (!email || status === "loading") return

    setStatus("loading")
    setMessage("")

    try {
      const res  = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (data.success) {
        setStatus("success")
        setMessage(t("form.success"))
      } else {
        setStatus("error")
        // Message d'erreur serveur ou fallback traduit
        setMessage(data.message || t("form.errorNetwork"))
      }
    } catch (err) {
      setStatus("error")
      setMessage(t("form.errorNetwork"))
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
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: "1.5rem",
          }}
        >
          {t("label")}
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
          {t("title.main")}
          <br />
          <em style={{ fontStyle: "italic", fontWeight: 200 }}>
            {t("title.highlight")}
          </em>
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
          {t("desc")}
        </p>

        {/* Newsletter form */}
        <div>
          {status === "success" ? (
            <p style={{ color: "var(--accent)", fontWeight: 500 }}>
              {message}
            </p>
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
                placeholder={t("form.placeholder")}
                value={email}
                style={{
                  flex: 1,
                  padding: "0.4rem 1.4rem",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border)",
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
                  ((e.target as HTMLInputElement).style.borderColor =
                    "var(--border)")
                }
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <Button variant="white" onClick={handleSubmit}>
                {status === "loading" ? t("form.loading") : t("form.submit")}
              </Button>
            </div>
          )}

          {status === "error" && (
            <p style={{ color: "var(--error)", fontWeight: 500 }}>
              {message}
            </p>
          )}
        </div>

        {/* Réseaux sociaux */}
        <div
          data-reveal
          data-delay="4"
          style={{
            display: "flex",
            gap: "1.5rem",
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: "1rem",
          }}
        >
          {SOCIAL_LINKS.map(({ key, href }) => (
            <SocialLink
              key={key}
              platform={key}
              href={href}
              label={t(`social.${key}`)}
              size={22}
            />
          ))}
        </div>
      </div>
    </section>
  )
}