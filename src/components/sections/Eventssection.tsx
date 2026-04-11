"use client"
import Image from "next/image"
import { Tag } from "@/lib/Tag"
import { Button } from "@/components/ui/Button"
import { useIntersectionObserver } from "@/components/hooks/Useintersectionobserver"
import { cn } from "@/lib/utils"
import { use } from "react"
import { useTranslations } from "next-intl"

const EVENTS = [
  {
    day: "26", month: "Mars",
    title: "Black in Blockchain - AnbaChain Ed. 2",
    location: "18h00 · 3426 R. Notre Dame O",
    access: "Gratuit membres",
    tag: "Networking",
    href: "https://luma.com/y2wqdizo",
  },
  // {
  //   day: "22", month: "Mai",
  //   title: "Demo Day — Cohorte Printemps 2025",
  //   location: "18h30 · Amphi + Luma Live",
  //   access: "Ouvert investisseurs",
  //   tag: "Demo Day",
  //   href: "https://lu.ma",
  // },
  // {
  //   day: "05", month: "Jun",
  //   title: "Conférence — ZK Proofs en production",
  //   location: "17h00 · En ligne + Présentiel",
  //   access: "Public",
  //   tag: "Conférence",
  //   href: "https://lu.ma",
  // },
]

export function EventsSection() {
  const t = useTranslations("sectionEvenements")
  const { ref: leftRef,  isVisible: leftVis  } = useIntersectionObserver<HTMLDivElement>()
  const { ref: featRef,  isVisible: featVis  } = useIntersectionObserver<HTMLDivElement>()

  return (
    <section id="events" className="section-light py-section">
      <div className="container-site">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-16 items-start">
          {/* Left — list */}
          <div ref={leftRef}>
            <div className={cn("transition-[opacity,transform] duration-720 ease-in-out", leftVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[26px]")}>
              <Tag light className="mb-[1.1rem]"> {t("events")}</Tag>
              <h2 className="font-serif text-[clamp(1.9rem,3vw,2.7rem)] text-lt-ink font-light tracking-[-0.022em] mt-[1.1rem] mb-[2.3rem]">
                {t("title.meetings")} <br /> <span className="text-gold-lt">{t("title.meetings2")}</span>
              </h2>
            </div>

            {/* Event rows */}
            {EVENTS.map((ev, i) => (
              <a
                key={i}
                href={ev.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "grid grid-cols-[4.2rem_1fr_auto] gap-6 items-center py-[1.4rem] border-b border-lt-line first:border-t",
                  "hover:border-lt-line-h transition-[border-color] duration-200 cursor-pointer no-underline",
                  "transition-[opacity,transform] ease-in-out duration-600",
                  leftVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
                )}
                style={{ transitionDelay: leftVis ? `${(i + 1) * 80}ms` : "0ms" }}
              >
                {/* Date */}
                <div className="text-center">
                  <span className="font-serif text-[1.7rem] text-lt-ink block leading-none font-light">{ev.day}</span>
                  <span className="text-[.62rem] tracking-[.1em] uppercase text-gold-lt">{ev.month}</span>
                </div>

                {/* Info */}
                <div>
                  <h4 className="text-[.86rem] font-medium text-lt-ink mb-[.18rem]">{ev.title}</h4>
                  <div className="text-[.73rem] text-lt-muted flex gap-3">
                    <span>{ev.location}</span>
                    <span>{ev.access}</span>
                  </div>
                </div>

                {/* Tag badge */}
                <span className="text-[.6rem] px-[.55rem] py-[.16rem] border border-lt-line-h rounded-[3px] text-lt-muted whitespace-nowrap">
                  {ev.tag}
                </span>
              </a>
            ))}

            {/* Luma link */}
            <a
              href="https://luma.com/calendar/cal-aqEzCpUP5LXSBcL?period=past"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-[.42rem] text-[.75rem] text-lt-muted-2 border border-lt-line rounded-full px-[.85rem] py-[.33rem] mt-[1.3rem] hover:border-gold-lt hover:text-gold-lt transition-all duration-200"
            >
              <span className="w-[5px] h-[5px] bg-[#6366f1] rounded-full" />
              {t("allevents")} →
            </a>
          </div>

          {/* Right — featured */}
          <div ref={featRef} className="lg:sticky lg:top-[5.5rem]">
            <div
              className={cn(
                "bg-lt-card border border-lt-line rounded-[var(--radius-lg)] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,.06)]",
                "transition-[opacity,transform] duration-[720ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                featVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[26px]"
              )}
            >
              <div className="h-[170px] overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"
                  alt="Summit 2025"
                  width={800}
                  height={170}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-[1.4rem]">
                <Tag light>{t("nextevents")}</Tag>
                <iframe
                  src="https://luma.com/embed/calendar/cal-aqEzCpUP5LXSBcL/events"
                  width="450"
                  height="250"
                  style={{ border: '1px solid #bfcbda88', borderRadius: '4px', marginBottom: '1.1rem' }}
                  aria-hidden="false"
                ></iframe>
              
                <Button href="https://lu.ma" variant="prim" className="w-full justify-center">
                  {t("subcrib")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}