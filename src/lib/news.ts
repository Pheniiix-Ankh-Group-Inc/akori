// lib/news.ts (ou directement dans le composant)
export async function getBlockchainArticles() {
  const res = await fetch("https://dev.to/api/articles?tag=blockchain&per_page=6", {
    next: { revalidate: 86400 }, // Cache 24h
  });
  if (!res.ok) return [];
  return res.json();
}