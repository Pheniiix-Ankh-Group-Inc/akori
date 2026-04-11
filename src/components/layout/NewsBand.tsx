"use client"
const ITEMS = [
  { text: "Ethereum Layer 2 : Arbitrum dépasse 4 000 développeurs actifs",              time: "il y a 2h" },
  { text: "Solana devient le n°1 des écosystèmes pour les nouveaux développeurs en 2024", time: "il y a 5h" },
  { text: "Les stablecoins atteignent $196Md en circulation — record historique",          time: "il y a 8h" },
  { text: "ZK Proofs : 639 déploiements on-chain en 2024 vs 40 en 2020",                  time: "hier"      },
  { text: "L'Inde devient le premier pays source de nouveaux développeurs crypto",         time: "hier"      },
  { text: "DeFi TVL 2024 : +89% porté par Ethereum",                                      time: "2j"        },
]

export function NewsBand() {
  return (
    <div className="bg-dk-2 border-t border-b border-dk-line h-[2.9rem] flex items-center overflow-hidden">
      {/* Label */}
      <div className="shrink-0 h-full bg-gold flex items-center px-[1.1rem] text-[.65rem] font-medium tracking-[.16em] uppercase text-dk whitespace-nowrap">
        Actualités
      </div>

      {/* Belt */}
      <div
        className="overflow-hidden flex-1"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 2%, black 96%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 2%, black 96%, transparent)",
        }}
      >
        <div
          className="flex w-max items-center h-[2.9rem]"
          style={{ animation: "belt 52s linear infinite" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.animationPlayState = "paused")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.animationPlayState = "running")}
        >
          {[...ITEMS, ...ITEMS].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-[.65rem] px-[2.2rem] border-r border-dk-line h-full whitespace-nowrap text-[.77rem] text-muted-2 cursor-pointer hover:text-snow transition-colors duration-200"
            >
              <span className="w-0.75 h-0.75 rounded-full bg-gold shrink-0" />
              <span>{item.text}</span>
              <span className="text-[.64rem] text-muted">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}