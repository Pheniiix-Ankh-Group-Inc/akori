"use client"
import { Tag } from "@/lib/Tag"
import { useIntersectionObserver } from "@/components/hooks/Useintersectionobserver"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

const LOGOS = [
  "Ethereum","Solana Fdn","Polygon","Chainlink",
  "Arbitrum","Optimism","The Graph","Uniswap","Aave","StarkNet",
]

export function PartnersSection() {
  const  t  = useTranslations("sectionPartenaires")
  const { ref, isVisible } = useIntersectionObserver<HTMLDivElement>()

  return (
    <section id="partners" className="section-dark py-18">
      <div className="container-site">
        {/* Header */}
        <div
          ref={ref}
          className={cn(
            "text-center mb-[2.8rem] transition-[opacity,transform] duration-720 ease-in-out",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6.5"
          )}
        >
          <Tag className="mb-4 justify-center">{t("title.main")}</Tag>
          <h2 className="font-serif text-[clamp(1.6rem,2.4vw,2.1rem)] text-snow font-light tracking-[-0.022em] mt-4 mb-[.55rem]">
            {t("title.sub")}
          </h2>
          <p className="text-[.86rem] text-muted-2 max-w-[46ch] mx-auto">
            {t("title.description")}
          </p>
        </div>

        {/* Belt */}
        <div
          className="overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div
            className="flex gap-4 w-max"
            style={{ animation: "belt 30s linear infinite" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.animationPlayState = "paused")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.animationPlayState = "running")}
          >
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <div
                key={i}
                className="w-31.5 h-11.5 flex-shrink-0 bg-dk-card border border-dk-line rounded--radius flex items-center justify-center hover:border-dk-line-h transition-[border-color] duration-200 cursor-pointer"
              >
                <span className="font-serif text-[.76rem] text-muted tracking-[.05em] font-light">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}