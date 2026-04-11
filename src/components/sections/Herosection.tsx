"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"

const AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=60&q=80",
]

export function HeroSection() {
  const t = useTranslations("sectionHero")
  const [isVisible, setIsVisible] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true)
    }, { threshold: 0.1 })
    if (heroRef.current) observer.observe(heroRef.current)
    return () => observer.disconnect()
  }, [])

  const fuClass = (delayMs: number) => cn(
    "fu",
    isVisible && "in"
  )

  return (
    <section 
      ref={heroRef}
      className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden relative bg-dk"
      style={{ minHeight: "calc(100vh - 5.85rem)" }}
    >
      {/* LEFT - Content */}
      <div 
        className="flex flex-col justify-center relative z-2"
        style={{
          padding: "clamp(3rem, 7vw, 6rem) var(--spacing-gut)",
          paddingLeft: "max(var(--spacing-gut), calc((100vw - var(--width-content)) / 2 + var(--spacing-gut)))"
        }}
      >
        <div className={fuClass(0)} style={{ transitionDelay: '0ms' }}>
          <span className="tag mb-[1.8rem]">{t("tag")}</span>
        </div>

        <h1 
          className={cn(fuClass(80), "font-serif text-snow font-extralight leading-[1.07] tracking-[-0.025em] mb-[1.7rem]")}
          style={{ fontSize: "clamp(2.6rem, 5.2vw, 5rem)", transitionDelay: '80ms' }}
        >
          {t("title.main")}<br />
          {t("title.highlight") && <><em className="text-gold italic">{t("title.highlight")}</em>{t("title.suffix")}</>}
        </h1>

        <p 
          className={cn(fuClass(160), "text-muted2 leading-[1.78] max-w-[44ch] mb-[2.6rem]")}
          style={{ fontSize: "clamp(.88rem, 1.15vw, .98rem)", transitionDelay: '160ms' }}
        >
          {t("description")}
        </p>

        <div className={cn(fuClass(240), "flex items-center gap-[1.6rem] mb-12 flex-wrap")} style={{ transitionDelay: '240ms' }}>
          <Button href="#join" variant="prim">{t("buttons.join")}</Button>
          <Button variant="sec" href="#mission" arrow={false}>{t("buttons.mission")}</Button>
        </div>

        {/* Social Proof */}
        <div className={cn(fuClass(320), "flex items-center gap-[1.1rem] pt-[1.8rem]")} style={{ transitionDelay: '320ms' }}>
          <div className="flex">
            {AVATARS.map((src, i) => (
              <div key={i} className="w-[1.95rem] h-[1.95rem] rounded-full border-2 border-dk overflow-hidden -mr-[.6rem] flex-shrink-0 relative z-1">
                <Image src={src} alt="avatar" width={40} height={40} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="text-[.77rem] text-muted2 leading-[1.45] tracking-[0.01em]">
            <strong className="text-snow font-medium block">{t("socialProof.members")}</strong>
            {t("socialProof.projects")}
          </div>
        </div>
      </div>

      {/* RIGHT - Visuals */}
      <div className="relative overflow-hidden h-[70vw] lg:h-auto">
        <div 
          className="absolute inset-0 z-2 pointer-events-none hidden lg:block"
          style={{ background: "linear-gradient(to right, var(--color-dk) 0%, transparent 20%)" }}
        />
        
        {/* Live Badge */}
        {/* <div className="absolute top-[1.2rem] left-[1.2rem] z-10 flex items-center gap-2 bg-[rgba(8,9,9,0.75)] backdrop-blur-md border rounded-full py-[0.4rem] pr-[0.9rem] pl-2 text-[0.68rem] text-snow uppercase tracking-widest font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-live" />
          {t("badgeLive")}
        </div> */}

        {/* Image Grid */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[0.6rem] p-[0.6rem]">
          <div className="row-span-2 rounded-sm overflow-hidden relative group bg-dk2">
            <Image 
              src="https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1000" 
              fill 
              priority
              className="object-cover transition-transform duration-[1.2s] group-hover:scale-105" 
              alt="Office space" 
            />
          </div>
          <div className="rounded-sm overflow-hidden relative group bg-dk2">
            <Image 
              src="https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=700" 
              fill 
              className="object-cover transition-transform duration-[1.2s] group-hover:scale-105" 
              alt="Tech building" 
            />
          </div>
          <div className="rounded-sm overflow-hidden relative group bg-dk2">
            <Image 
              src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=700" 
              fill 
              className="object-cover transition-transform duration-[1.2s] group-hover:scale-105" 
              alt="Blockchain event" 
            />
          </div>
        </div>

        {/* Floating KPI Card */}
        <div className="absolute bottom-[1.8rem] right-[1.8rem] z-10 bg-[rgba(14,15,16,0.85)] backdrop-blur-xl border rounded-sm p-6 min-w-[180px] shadow-2xl">
          <span className="font-serif text-3xl text-snow font-extralight leading-none block tracking-tighter">
            {t("kpi.value")}
          </span>
          <div className="text-[0.62rem] text-muted tracking-[0.12em] uppercase mt-2 mb-2 font-medium">
            {t("kpi.label")}
          </div>
          <div className="text-[0.65rem] text-success flex items-center gap-1.5 font-medium">
            <span className="text-[0.5rem]">▲</span> {t("kpi.trend")}
          </div>
        </div>
      </div>
    </section>
  )
}