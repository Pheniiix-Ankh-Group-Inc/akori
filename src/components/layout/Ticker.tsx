"use client"
import { useCryptoPrices } from "@/../src/components/hooks/Usecryptoprices"

export function Ticker() {
  const { loading, coins, formatter } = useCryptoPrices();


  const items = loading ? [{ symbol: "Chargement…", price: 0, change: null }] : [...coins, ...coins]

  return (
    <div
      className="h-[2.1rem] bg-dk-2 border-b border-dk-line overflow-hidden flex items-center relative z-200"
      aria-label="Cours crypto en temps réel"
    >
      <div
        className="overflow-hidden flex-1"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
        }}
      >
        <div
          className="flex w-max"
          style={{ animation: "belt 80s linear infinite" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = "paused")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = "running")}
        >
          {items.map((coin: any, i: number) => {
            const up = coin.change == null || coin.change >= 0

            return (
              <div
                key={`${coin.symbol}-${i}`}
                className="flex items-center gap-[.38rem] px-[1.3rem] border-r border-dk-line h-[2.1rem] whitespace-nowrap"
              >
                {/* Point of color */}
                {coin.change !== null && (
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: up ? "var(--color-success)" : "var(--color-danger)" }}
                  />
                )}

                {/* Symbole */}
                <span className="text-[.7rem] font-medium text-snow tracking-[.05em] uppercase">
                  {coin.symbol}
                </span>

                {/* Price */}
                {coin.price > 0 && (
                  <span className="text-[.7rem] text-muted-2">
                    {formatter(coin.price)}
                  </span>
                )}

                {/* POURCENTAGE */}
                {coin.change !== null && (
                  <span
                    className="text-[.68rem] font-medium"
                    style={{ color: up ? "var(--color-success)" : "var(--color-danger)" }}
                  >
                    {up ? "+" : ""}{coin.change.toFixed(2)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}