"use client"
import Image from "next/image"
import { Tag } from "@/lib/Tag"
import { Button } from "@/components/ui/Button"
import { useIntersectionObserver } from "@/components/hooks/Useintersectionobserver"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

// On garde les données "statiques" (images, nombres) ici, 
// mais on récupère les textes depuis le JSON
const POST_METADATA = [
  {
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=80&q=80",
    likes: 41, comments: 12, locked: false,
    image: null,
  },
  {
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
    likes: 67, comments: 23, locked: false,
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=75",
  },
  {
    avatar: null, initial: "S",
    likes: 0, comments: 0, locked: true,
    image: null,
  },
]

export function CommunitySection() {
  const t = useTranslations("communauteSection")
  const { ref: leftRef,  isVisible: leftVis  } = useIntersectionObserver<HTMLDivElement>()
  const { ref: feedRef,  isVisible: feedVis  } = useIntersectionObserver<HTMLDivElement>()

  // Récupération des tableaux depuis le JSON
  const stats = t.raw("stats") as Array<{ n: string; label: string }>
  const postsText = t.raw("posts") as Array<{ name: string; meta: string; chips: string[]; body: string }>

  return (
    <section id="community" className="section-dark py-section relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-[-15%] left-[35%] w-[55vw] h-[55vw] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(196,151,92,.04) 0%, transparent 65%)" }} />

      <div className="container-site">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-[5rem] items-start">
          
          {/* Left sticky */}
          <div ref={leftRef} className="lg:sticky lg:top-[5.5rem]">
            <div className={cn("transition-[opacity,transform] duration-720 ease-in-out", leftVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[26px]")}>
              <Tag className="mb-[1.1rem]">{t("label")}</Tag>
              <h2 className="font-serif text-[clamp(1.9rem,3vw,2.7rem)] text-snow font-light leading-[1.13] tracking-[-0.022em] mt-[1.1rem] mb-[1.3rem]">
                {t("title.main")} <em className="italic text-gold">{t("title.highlight")}</em>{t("title.suffix")}
              </h2>
              <p className="text-[.9rem] text-muted-2 leading-[1.8] mb-[1.8rem] max-w-[38ch]">
                {t("description")}
              </p>
              
              <div className="flex flex-col gap-[.55rem] mb-[2.2rem]">
                {stats.map((s, idx) => (
                  <div key={idx} className="flex justify-between px-[.95rem] py-[.85rem] bg-dk-card border border-dk-line rounded-[var(--radius)]">
                    <span className="font-serif text-[1.35rem] text-snow font-light">{s.n}</span>
                    <span className="text-[.73rem] text-muted self-center">{s.label}</span>
                  </div>
                ))}
              </div>
              <Button href="#pricing">{t("cta")}</Button>
            </div>
          </div>

          {/* Feed */}
          <div ref={feedRef} className="flex flex-col gap-[.95rem]">
            {POST_METADATA.map((meta, i) => {
              const text = postsText[i]
              return (
                <article
                  key={i}
                  className={cn(
                    "bg-dk-card border border-dk-line rounded-[var(--radius-lg)] p-[1.5rem] relative overflow-hidden",
                    "hover:border-dk-line-h hover:-translate-y-[2px] transition-[border-color,transform] duration-[300ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                    "transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] duration-[600ms]",
                    feedVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[20px]"
                  )}
                  style={{ transitionDelay: feedVis ? `${i * 80}ms` : "0ms" }}
                >
                  {/* Lock overlay */}
                  {meta.locked && (
                    <>
                      <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to bottom, transparent 25%, rgba(8,9,9,.95))" }} />
                      <div className="absolute bottom-0 left-0 right-0 z-[2] flex flex-col items-center gap-[.55rem] p-[1.1rem] bg-[rgba(8,9,9,.65)] backdrop-blur-[6px]">
                        <p className="text-[.76rem] text-muted-2 text-center">{t("lockedMessage")}</p>
                        <Button href="#pricing" arrow={false}>{t("viewPlans")} →</Button>
                      </div>
                    </>
                  )}

                  {/* Author */}
                  <div className="flex items-center gap-[.85rem] mb-[.85rem]">
                    {meta.avatar ? (
                      <div className="w-[2rem] h-[2rem] rounded-full overflow-hidden flex-shrink-0 border border-dk-line-h">
                        <Image src={meta.avatar} alt={text.name} width={32} height={32} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-[2rem] h-[2rem] rounded-full bg-gold-dim border border-[rgba(196,151,92,.2)] flex items-center justify-center font-serif text-[.78rem] text-gold flex-shrink-0">
                        {meta.initial}
                      </div>
                    )}
                    <div>
                      <h5 className="text-[.83rem] font-medium text-snow">{text.name}</h5>
                      <span className="text-[.7rem] text-muted">{text.meta}</span>
                    </div>
                  </div>

                  {/* Chips */}
                  <div className="flex gap-[.32rem] mb-[.75rem]">
                    {text.chips.map(c => (
                      <span key={c} className="text-[.62rem] px-[.55rem] py-[.16rem] bg-gold-dim text-gold rounded-[3px] tracking-[.04em]">{c}</span>
                    ))}
                  </div>

                  {/* Body */}
                  <p className="text-[.84rem] text-muted-2 leading-[1.7] mb-[.9rem]">{text.body}</p>

                  {/* Image */}
                  {meta.image && (
                    <div className="rounded-[var(--radius)] overflow-hidden mb-[.9rem] max-h-[190px]">
                      <Image src={meta.image} alt="" width={800} height={190} className="w-full object-cover" />
                    </div>
                  )}

                  {/* Actions */}
                  {!meta.locked && (
                    <div className="flex gap-[.95rem]">
                      <button className="text-[.73rem] text-muted flex items-center gap-[.3rem] hover:text-gold transition-colors duration-200">♡ {meta.likes}</button>
                      <button className="text-[.73rem] text-muted flex items-center gap-[.3rem] hover:text-gold transition-colors duration-200">💬 {meta.comments}</button>
                      <button className="text-[.73rem] text-muted flex items-center gap-[.3rem] hover:text-gold transition-colors duration-200">↗ {t("share")}</button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}