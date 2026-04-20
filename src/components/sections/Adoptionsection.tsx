"use client"
import { useEffect, useRef, useState } from "react"
import { useIntersectionObserver } from "@/components/hooks/Useintersectionobserver"
import { Tag } from "@/lib/Tag"
import { GrowthBarChart } from "@/components/charts/Growthbarchart"
import { EcosystemBars } from "@/components/charts/Ecosystembars"
import { GeoDonut } from "@/components/charts/Geodonut"
import { SparkLine } from "@/components/charts/Sparkline"
import { cn } from "@/lib/utils"

const MULTI = [
  { label: "Devs multi-chain",  w: 34, val: "34%", green: false },
  { label: "EVM multi-chain",   w: 74, val: "74%", green: true  },
  { label: "ETH devs sur L2",   w: 56, val: "56%", green: false },
  { label: "Bitcoin scaling",   w: 42, val: "42%", green: false },
]

const KPIS = [
  { label: "Devs actifs / mois",        val: 23613,  fmt: "space", suffix: "",    badge: "+39% / an",    badgeUp: true,  sub: "depuis 2015"        },
  { label: "Seniors (2+ ans)",          val: 27,     fmt: "",      suffix: "%",   badge: "70%",           badgeUp: true,  sub: "des commits"        },
  { label: "Stablecoins en circulation",val: 196,    fmt: "",      prefix:"$",    suffix: "Md",badge:"ATH",badgeUp:false, sub: "record historique"  },
  { label: "TVL DeFi 2024",            val: 89,     fmt: "",      prefix: "+",   suffix: "%",  badge:"+89%",badgeUp:true, sub: "sur l'année"        },
]

function useCounter(target: number, run: boolean, fmt = "", prefix = "", suffix = "", duration = 1800) {
  const [val, setVal] = useState(0)
  const ran = useRef(false)
  useEffect(() => {
    if (!run || ran.current) return
    ran.current = true
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const e = t < 0.5 ? 2*t*t : (-1+(4-2*t)*t)
      setVal(Math.round(e * target))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [run, target, duration])

  const display = fmt === "space" ? val.toLocaleString("fr-FR") : String(val)
  return prefix + display + suffix
}

function KpiCard({ label, val, fmt="", prefix="", suffix="", badge, badgeUp, sub, run }: typeof KPIS[0] & { run: boolean }) {
  const display = useCounter(val, run, fmt, prefix ?? "", suffix, 1800)
  return (
    <div className="bg-lt-card border border-lt-line rounded-[var(--radius)] p-[1.4rem] hover:border-lt-line-h hover:shadow-[0_4px_20px_rgba(0,0,0,.06)] transition-[border-color,box-shadow] duration-[250ms]">
      <div className="text-[.65rem] tracking-[.13em] uppercase text-lt-muted mb-[.65rem]">{label}</div>
      <div className="font-serif text-[2.1rem] text-lt-ink font-light leading-none mb-[.35rem]">{display}</div>
      <div className="text-[.73rem] text-lt-muted-2 flex items-center gap-[.3rem]">
        <span className={cn("text-[.64rem] font-medium px-[.5rem] py-[.14rem] rounded-[3px]", badgeUp ? "bg-[rgba(61,184,112,.1)] text-[#2a9455]" : "bg-[rgba(196,151,92,.1)] text-gold-lt")}>{badge}</span>
        {sub}
      </div>
    </div>
  )
}

export function AdoptionSection() {
  const { ref: kpiRef, isVisible: kpiVis } = useIntersectionObserver<HTMLDivElement>({ threshold: 0.3 })
  const multiRef = useRef<(HTMLDivElement | null)[]>([])
  const { ref: multiWrap, isVisible: multiVis } = useIntersectionObserver<HTMLDivElement>({ threshold: 0.2 })
  const multiAnimated = useRef(false)

  useEffect(() => {
    if (!multiVis || multiAnimated.current) return
    multiAnimated.current = true
    MULTI.forEach((item, i) => {
      const el = multiRef.current[i]
      if (!el) return
      setTimeout(() => { el.style.width = item.w + "%" }, i * 80)
    })
  }, [multiVis])

  return (
    <section id="adoption" className="section-light py-[var(--spacing-section)]">
      <div className="container-site">
        {/* Header */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-end mb-12">
          <div>
            <Tag light className="mb-[.9rem]">Données d&apos;adoption · Electric Capital 2024</Tag>
            <h2 className="font-serif text-[clamp(1.8rem,3vw,2.7rem)] text-lt-ink font-light leading-[1.13] tracking-[-0.022em]">La blockchain en chiffres.</h2>
            <p className="text-lt-muted-2 text-[.87rem] mt-[.6rem] max-w-[50ch]">Analyse de 902 millions de commits sur 1,7M de dépôts — la preuve par le code que l&apos;adoption est structurelle.</p>
          </div>
          <div className="text-[.7rem] text-lt-muted text-right whitespace-nowrap">
            Source : <a href="https://www.developerreport.com" target="_blank" rel="noopener" className="text-gold-lt hover:underline">developerreport.com</a><br />Electric Capital · 2024
          </div>
        </div>

        {/* KPIs */}
        <div ref={kpiRef} className="grid grid-cols-2 md:grid-cols-4 gap-[.9rem] mb-[1.8rem]">
          {KPIS.map(k => <KpiCard key={k.label} {...k} run={kpiVis} />)}
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-[.9rem] mb-[.9rem]">
          <div className="bg-lt-card border border-lt-line rounded-[var(--radius)] p-[1.5rem] hover:border-lt-line-h hover:shadow-[0_4px_20px_rgba(0,0,0,.05)] transition-[border-color,box-shadow] duration-[250ms]">
            <div className="flex justify-between items-start mb-[1.2rem]">
              <span className="text-[.73rem] text-lt-muted tracking-[.07em] uppercase">Développeurs actifs / mois 2015–2024</span>
              <span className="text-[.62rem] px-[.56rem] py-[.16rem] rounded-[3px] bg-[rgba(196,151,92,.1)] text-gold-lt tracking-[.04em]">Electric Capital</span>
            </div>
            <GrowthBarChart />
          </div>
          <div className="bg-lt-card border border-lt-line rounded-[var(--radius)] p-[1.5rem] hover:border-lt-line-h transition-[border-color,box-shadow] duration-[250ms]">
            <div className="flex justify-between items-start mb-[1.2rem]">
              <span className="text-[.73rem] text-lt-muted tracking-[.07em] uppercase">Top écosystèmes</span>
              <span className="text-[.62rem] px-[.56rem] py-[.16rem] rounded-[3px] bg-[rgba(196,151,92,.1)] text-gold-lt">Devs actifs</span>
            </div>
            <EcosystemBars />
          </div>
          <div className="bg-lt-card border border-lt-line rounded-[var(--radius)] p-[1.5rem] hover:border-lt-line-h transition-[border-color,box-shadow] duration-[250ms]">
            <div className="flex justify-between items-start mb-[1.2rem]">
              <span className="text-[.73rem] text-lt-muted tracking-[.07em] uppercase">Géographie</span>
              <span className="text-[.62rem] px-[.56rem] py-[.16rem] rounded-[3px] bg-[rgba(196,151,92,.1)] text-gold-lt">2024</span>
            </div>
            <GeoDonut />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[.9rem]">
          <div className="bg-lt-card border border-lt-line rounded-[var(--radius)] p-[1.5rem] hover:border-lt-line-h transition-[border-color,box-shadow] duration-[250ms]">
            <div className="flex justify-between items-start mb-[1.2rem]">
              <span className="text-[.73rem] text-lt-muted tracking-[.07em] uppercase">Multi-chain & Layer 2</span>
              <span className="text-[.62rem] px-[.56rem] py-[.16rem] rounded-[3px] bg-[rgba(196,151,92,.1)] text-gold-lt">Tendances 2024</span>
            </div>
            <div ref={multiWrap} className="flex flex-col gap-[.5rem]">
              {MULTI.map((item, i) => (
                <div key={item.label} className="flex items-center gap-[.75rem]">
                  <span className="text-[.7rem] text-lt-muted-2 w-[8.5rem] flex-shrink-0">{item.label}</span>
                  <div className="flex-1 h-[5px] bg-lt-2 rounded-[3px] overflow-hidden">
                    <div
                      ref={el => { multiRef.current[i] = el }}
                      className={cn("h-full rounded-[3px] w-0 transition-[width] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                        item.green ? "bg-gradient-to-r from-success to-[#5bcf8a]" : "bg-gradient-to-r from-gold to-[#d4a86a]"
                      )}
                    />
                  </div>
                  <span className="text-[.69rem] text-lt-muted w-[2.8rem] flex-shrink-0">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-lt-card border border-lt-line rounded-[var(--radius)] p-[1.5rem] hover:border-lt-line-h transition-[border-color,box-shadow] duration-[250ms]">
            <div className="flex justify-between items-start mb-[1.2rem]">
              <span className="text-[.73rem] text-lt-muted tracking-[.07em] uppercase">Seniors vs Nouveaux devs</span>
              <span className="text-[.62rem] px-[.56rem] py-[.16rem] rounded-[3px] bg-[rgba(196,151,92,.1)] text-gold-lt">Évolution</span>
            </div>
            <SparkLine />
          </div>
        </div>
      </div>
    </section>
  )
}