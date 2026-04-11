"use client"
import { Button } from "@/components/ui/Button"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl" 

interface Pillar {
  id: string;
  title: string;
  body: string;
}

export function MissionSection() {
  const t = useTranslations("mission")
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  const pillars = t.raw("pillars") as Pillar[]

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true)
    }, { threshold: 0.1 })
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const fuClass = (inView: boolean) => cn(
    "transition-all duration-[720ms] ease-out",
    inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[26px]"
  )

  return (
    <section 
      id="mission" 
      ref={sectionRef}
      className="bg-dk py-section border-b border-dkLine"
    >
      <div className="container-site">
        <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-12 lg:gap-20 items-start">
          
          {/* Left Column - Sticky Content */}
          <div className="lg:sticky lg:top-32">
            <div className={fuClass(isVisible)}>
              <span className="tag mb-[1.8rem]">{t("tag")}</span>
              
              <h2 className="font-serif text-[clamp(2.1rem,3.4vw,3.2rem)] text-snow font-extralight leading-[1.12] tracking-[-0.02em] mb-7">
                {t("title.main")} <em className="italic text-gold">{t("title.highlight")}</em><br /> 
                {t("title.suffix")}
              </h2>
              
              <p className="text-[0.94rem] text-muted2 leading-[1.8] mb-9 max-w-[42ch]">
                {t("description")}
              </p>
              
              <Button href="#pricing" variant="prim">
                {t("cta")}
              </Button>
            </div>
          </div>

          {/* Right Column - Pillars List */}
          <div className="flex flex-col">
            {pillars.map((p, i) => (
              <div
                key={p.id}
                className={cn(
                  "grid grid-cols-[3.5rem_1fr] gap-4 py-8 border-b border-dkLine first:border-t transition-all duration-500",
                  "hover:border-dkLineH group",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                )}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Numéro */}
                <span className="font-serif text-[0.8rem] text-gold/60 group-hover:text-gold transition-colors pt-1">
                  {p.id}
                </span>
                
                {/* Contenu */}
                <div>
                  <h4 className="text-[1.05rem] font-medium text-snow mb-2 tracking-tight transition-colors group-hover:text-gold">
                    {p.title}
                  </h4>
                  <p className="text-[0.88rem] text-muted2 leading-[1.7] max-w-[55ch]">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </section>
  )
}