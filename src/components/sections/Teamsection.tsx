"use client"
import Image from "next/image"
import { Tag } from "@/lib/Tag"
import { useIntersectionObserver } from "@/components/hooks/Useintersectionobserver"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

const FOUNDERS = [
  {
    photo: "/images/fadjiah_collin_mazile.jpg",
    name: "Fadjiah Collin‑Mazile",
    role: "Co-fondatrice &  Data leader, angel investor & blockchain strategist",
    quote: "«»",
    bio: "bio.fadjiah.bio",
    links: ["LinkedIn: https://www.linkedin.com/in/fadjiah-collin-mazile/"],
  },
  {
    photo: "/images/brice_mimifir.jpg",
    name: "Brice Mimifir",
    role: "Co-fondateur & Digital Transformation Consultant & Blockchain Developer",
    quote: "«»",
    bio: "bio.brice.bio",
    links: ["LinkedIn: https://www.linkedin.com/in/brice-mimifir/"],
  },
]

export function TeamSection() {
  const t = useTranslations("sectionTeam")
  const { ref: hdRef,  isVisible: hdVis  } = useIntersectionObserver<HTMLDivElement>()
  const { ref: duoRef, isVisible: duoVis } = useIntersectionObserver<HTMLDivElement>()
  const { ref: panoRef,isVisible: panoVis} = useIntersectionObserver<HTMLDivElement>()

  return (
    <section id="team" className="section-light-2 py-section">
      <div className="container-site">
        {/* Header */}
        <div ref={hdRef} className={cn("mb-12 transition-[opacity,transform] duration-720 ease-in-out", hdVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[26px]")}>
          <Tag light className="mb-[1.1rem]">{t("funder")}</Tag>
          <p className="text-lt-muted-2 text-[.9rem] max-w-[50ch]">
            {t("description")}
          </p>
        </div>

        {/* Duo */}
        <div ref={duoRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-205">
          {FOUNDERS.map((f, i) => (
            <div
              key={f.name}
              className={cn(
                "bg-lt-card  border-lt-line overflow-hidden",
                "hover:border-lt-line-h hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,.09)]",
                "transition-[border-color,transform,box-shadow] duration-300 ease-in-out",
                "transition-[opacity,transform] ease-in-out duration-600",
                duoVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
              )}
              style={{ transitionDelay: duoVis ? `${i * 80}ms` : "0ms" }}
            >
              {/* Photo */}
              <div className="aspect-4/5 relative overflow-hidden bg-lt-2 group">
                <Image src={f.photo} alt={f.name} fill className="object-cover object-top transition-transform duration-550 ease-in-out group-hover:scale-[1.04]" sizes="(max-width: 820px) 50vw, 410px" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(17,18,16,.55) 0%, transparent 50%)" }} />
                {/* <div className="absolute bottom-4 left-4 right-4 bg-[rgba(250,250,248,.88)] backdrop-blur-[10px] rounded-[var(--radius)] px-[.9rem] py-[.75rem] font-serif text-[.82rem] text-lt-ink-2 italic leading-[1.5]">
                  {f.quote}
                </div> */}
              </div>

              {/* Body */}
              <div className="p-[1.4rem]">
                <h4 className="text-[.93rem] font-medium text-lt-ink mb-[.1rem]">{f.name}</h4>
                <p className="text-[.72rem] text-gold-lt tracking-[.05em] mb-3">{f.role}</p>
                <p className="text-[.79rem] text-lt-muted-2 leading-[1.62]">{t(f.bio)}</p>
                <div className="flex gap-[.7rem] mt-4">
                  {f.links.map((l, k) => (
                    <a key={l} href={l.split(": ")[1]} className="text-[.7rem] text-lt-muted-2 border border-lt-line rounded-xs px-[.7rem] py-[.3rem] hover:border-gold-lt hover:text-gold-lt transition-all duration-200 tracking-[.04em]">{l.split(": ")[0]}</a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}