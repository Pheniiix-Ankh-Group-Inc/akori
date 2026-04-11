"use client"
import { useState, useId } from "react"
import { Tag } from "@/lib/Tag"
import { Button } from "@/components/ui/Button"
import { useIntersectionObserver } from "@/components/hooks/Useintersectionobserver"
import { cn } from "@/lib/utils"
import { set } from "zod"
import { useTranslations } from "next-intl"

const TOPICS = ["DeFi", "Layer 2", "Solana", "Régulation", "Infra"]

export function NewsletterSection() {
  const t = useTranslations("sectionCommunaute")
  const { ref, isVisible } = useIntersectionObserver<HTMLDivElement>()
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [firstName, setFirstName] = useState("")
  const [email, setEmail] = useState("")
  const [topics, setTopics] = useState<string[]>(["DeFi", "Layer 2"])
  const [submitted, setSubmitted] = useState(false)
  const id = useId()

  function toggleTopic(t: string) {
    setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email) return
    setStatus("loading")

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          email,
          topics
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSubmitted(true)
        setStatus("success")
        setFirstName("")
        setEmail("")
        setTopics(["DeFi", "Layer 2"])
      } else {
        setStatus("error")
      }
    } catch (error) {
      setStatus("error")
      console.error("An error occurred:", error)
    } finally {
      setTimeout(() => {
        setSubmitted(false)
        setStatus("idle")
      }, 3000)
    }
  }

  return (
    <section id="newsletter" className="section-light-2 py-section">
      <div className="container-site">
        <div
          ref={ref}
          className={cn(
            "grid grid-cols-1 lg:grid-cols-2 gap-20 items-center",
            "bg-lt-card border border-lt-line rounded-lg p-[3.2rem] relative overflow-hidden",
            "shadow-[0_2px_24px_rgba(0,0,0,.05)]",
            "transition-[opacity,transform] duration-720 ease-in-out",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6.5"
          )}
        >
          {/* Glow */}
          <div
            className="absolute right-[-8%] top-1/2 -translate-y-1/2 w-[45%] h-[140%] pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(196,151,92,.06) 0%, transparent 65%)" }}
          />

          {/* Left */}
          <div className="relative z-1">
            <Tag light className="mb-[.9rem]">Newsletter</Tag>
            <h2 className="font-serif text-[clamp(1.6rem,2.4vw,2.2rem)] text-lt-ink font-light tracking-[-0.022em] mb-[.9rem]">
              {t("title.main")} <br /> <span className="text-gold-lt">{t("title.highlight")}</span>
            </h2>
            <p className="text-[.88rem] text-lt-muted-2 leading-[1.74]">
              {t("desc")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-[.8rem] relative z-1">
            {/* Name + email row */}
            <div className="flex gap-[.6rem] flex-col sm:flex-row">
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder={t("form.prenom")}
                className="flex-1 bg-lt-2 border border-lt-line rounded-(--radius) px-4 py-[.7rem] text-lt-ink font-sans text-[.83rem] outline-none focus:border-lt-line-h placeholder:text-lt-muted transition-colors duration-200"
              />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder={t("form.email")}
                className="flex-1 bg-lt-2 border border-lt-line rounded-(--radius) px-4 py-[.7rem] text-lt-ink font-sans text-[.83rem] outline-none focus:border-lt-line-h placeholder:text-lt-muted transition-colors duration-200"
              />
            </div>

            {/* Topics */}
            <div>
              <p className="text-[.67rem] text-lt-muted mb-[.42rem] tracking-[.08em] uppercase">{t("form.interest")}</p>
              <div className="flex flex-wrap gap-[.38rem]">
                {TOPICS.map(t => {
                  const tid = `${id}-${t}`
                  const checked = topics.includes(t)
                  return (
                    <label
                      key={t}
                      htmlFor={tid}
                      className={cn(
                        "text-[.50rem] px-[.7rem] py-1 border cursor-pointer select-none transition-all duration-200",
                        checked
                          ? "border-gold-lt text-gold-lt bg-[rgba(196,151,92,.08)]"
                          : "border-lt-line text-lt-muted hover:border-lt-line-h"
                      )}
                    >
                      <input
                        type="checkbox"
                        id={tid}
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleTopic(t)}
                      />
                      {t}
                    </label>
                  )
                })}
              </div>
            </div>

            <Button type="submit" variant="prim" arrow={false} className="self-start">
              {submitted ? "✓ " + t("form.subscribed") + " !" : t("form.submit")} →
            </Button>

          </form>
        </div>
      </div>
    </section>
  )
}