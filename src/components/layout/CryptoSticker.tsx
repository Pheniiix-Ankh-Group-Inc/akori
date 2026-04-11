// import { getCryptoPrices } from "@/lib/crypto";

// export default async function CryptoSticker() {
//   const data = await getCryptoPrices();

//   const getPriceColor = (change: number) => {
//     return change > 0 ? "text-crypto-up" : "text-crypto-down";
//   };
//   const massiveSpacing = "gap-[60px] pr-[60px]"; 

//   return (
//     <div className="flex overflow-hidden py-10 w-full">
      
//       {/* Conteneur 1 */}
//       <div className={`flex animate-marquee shrink-0 items-center ${massiveSpacing}`}>
//         {data.map((coin: any) => (
//           <div key={coin.id} className="flex flex-col items-center shrink-0">
//             <span className="font-mono text-[11px] font-medium uppercase tracking-[0.5em]">
//               {coin.symbol}
//             </span>
//             <span className="text-white text-xs">
//               ${coin.current_price.toLocaleString()}
//             </span>
//             <span className={`font-mono text-[11px] mt-1.5 ${getPriceColor(coin.price_change_percentage_24h)}`}>
//               {coin.price_change_percentage_24h > 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
//             </span>
//           </div>
//         ))}
//       </div>

//       <div className={`flex animate-marquee2 shrink-0 items-center ${massiveSpacing}`}>
//         {data.map((coin: any) => (
//           <div key={`${coin.id}-copy`} className="flex flex-col items-center shrink-0">
//             <span className="font-mono text-[11px] font-medium uppercase tracking-[0.5em]">
//               {coin.symbol}
//             </span>
//             <span className="text-white text-xs">
//               ${coin.current_price.toLocaleString()}
//             </span>
//             <span className={`font-mono text-[11px] mt-1.5 ${getPriceColor(coin.price_change_percentage_24h)}`}>
//               {coin.price_change_percentage_24h > 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
//             </span>
//           </div>
//         ))}
//       </div>
      
//     </div>
//   );
// }