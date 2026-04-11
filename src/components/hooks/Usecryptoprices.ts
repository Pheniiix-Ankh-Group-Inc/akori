"use client"
import { useEffect, useCallback, useState } from "react";

export interface CoinData {
  symbol: string
  price: number
  change: number | null
}

const COINS = [
  { s: "btc", id: "bitcoin" }, { s: "eth", id: "ethereum" },
  { s: "sol", id: "solana" }, { s: "bnb", id: "binancecoin" },
  { s: "matic", id: "matic-network" }, { s: "arb", id: "arbitrum" },
  { s: "link", id: "chainlink" }, { s: "uni", id: "uniswap" },
  { s: "aave", id: "aave" }, { s: "avax", id: "avalanche-2" },
  { s: "dot", id: "polkadot" }, { s: "near", id: "near" },
  { s: "OP", id: "optimism" }, { s: "STX", id: "stacks" },
  { s: "SUI", id: "sui" },
]

function formatter(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(v);
}


export function useCryptoPrices(intervalMs = 60000) {
    const [coins, setCoins] = useState<CoinData[]>([])
    const [loading, setLoading] = useState(true);

    const fetch_ = useCallback(async () => {
        try {
            const ids = COINS.map((c) => c.id).join(",")
            const res = await fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&ids=${ids}`,
            )
            
            if (!res.ok) throw new Error("Erreur API");

            const data = await res.json();
            
            setCoins(
                COINS.map((c) => {
                    const entry = data.find((d: any) => d.id === c.id);
                    return {
                        symbol: c.s,
                        price:  entry?.current_price ?? 0,
                        change: entry?.price_change_percentage_24h ?? null,
                    };
                })
            );
        } catch (error) {
            console.error("Erreur Ticker:", error);
            setCoins(COINS.map((c) => ({ symbol: c.s, price: 0, change: null })));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch_();
        const id = setInterval(fetch_, intervalMs);
        return () => clearInterval(id);
    }, [fetch_, intervalMs]);

    return { loading, coins, formatter };
}