"use client"
import { useEffect, useRef } from "react"
import { useIntersectionObserver } from "@/components/hooks/Useintersectionobserver"
import { cn } from "@/lib/utils"

const ECO = [
  { label: "Ethereum", w: 100, val: "6 244" },
  { label: "Base",     w: 69,  val: "4 287" },
  { label: "Solana",   w: 60,  val: "3 720" },
  { label: "Arbitrum", w: 55,  val: "3 450" },
  { label: "Polygon",  w: 34,  val: "2 100" },
  { label: "Bitcoin",  w: 19,  val: "1 200" },
]

interface Props { green?: boolean }

export function EcosystemBars({ green = false }: Props) {
  const { ref, isVisible } = useIntersectionObserver<HTMLDivElement>({ threshold: 0.2 })
  const barsRef = useRef<(HTMLDivElement | null)[]>([])
  const animated = useRef(false)

  useEffect(() => {
    if (!isVisible || animated.current) return
    animated.current = true
    ECO.forEach((item, i) => {
      const el = barsRef.current[i]
      if (!el) return
      setTimeout(() => { el.style.width = item.w + "%" }, i * 80)
    })
  }, [isVisible])

  return (
    <div ref={ref} className="flex flex-col gap-[.5rem]">
      {ECO.map((item, i) => (
        <div key={item.label} className="flex items-center gap-[.75rem]">
          <span className="text-[.71rem] text-lt-muted-2 w-[5rem] text-right flex-shrink-0">{item.label}</span>
          <div className="flex-1 h-[5px] bg-lt-2 rounded-[3px] overflow-hidden relative">
            <div
              ref={el => { barsRef.current[i] = el }}
              className={cn("h-full rounded-[3px] w-0 transition-[width] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                green
                  ? "bg-gradient-to-r from-success to-[#5bcf8a]"
                  : "bg-gradient-to-r from-gold to-[#d4a86a]"
              )}
            />
          </div>
          <span className="text-[.69rem] text-lt-muted w-[2.8rem] flex-shrink-0">{item.val}</span>
        </div>
      ))}
    </div>
  )
}