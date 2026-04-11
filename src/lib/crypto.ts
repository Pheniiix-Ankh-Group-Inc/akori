"use client"
import { useEffect, useCallback, useState } from "react";

export interface CoinData {
  symbol: string
  price: number
  change: number | null
}

const COINS = [
  { s: "BTC", id: "bitcoin" }, { s: "ETH", id: "ethereum" },
  { s: "SOL", id: "solana" }, { s: "BNB", id: "binancecoin" },
  { s: "MATIC", id: "matic-network" }, { s: "ARB", id: "arbitrum" },
  { s: "LINK", id: "chainlink" }, { s: "UNI", id: "uniswap" },
  { s: "AAVE", id: "aave" }, { s: "AVAX", id: "avalanche-2" },
  { s: "DOT", id: "polkadot" }, { s: "NEAR", id: "near" },
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


export function useCryptoPrices(intervalMs = 60000) { // intervalMs en ms (60000 = 1min)
    const [coins, setCoins] = useState<CoinData[]>([])
    const [loading, setLoading] = useState(true);

    const fetch_ = useCallback(async () => {
        try {
            const ids = COINS.map((c) => c.id).join(",")
            const res = await fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&ids=${ids}`,
            )
            const data = await res.json();
            
            setCoins(
                COINS.map((c) => ({
                    symbol: c.s,
                    price:  data.find((d: any) => d.id === c.id)?.current_price ?? 0,
                    change: data.find((d: any) => d.id === c.id)?.price_change_percentage_24h ?? null,
                }))
            );
        } catch (error) {
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