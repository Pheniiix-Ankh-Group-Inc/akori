import { format } from "d3"

const comma = format(",")

export function fmt(n: number | null | undefined): string {
  return n == null ? "—" : comma(n)
}

export function fmtK(n: number | null | undefined): string {
  if (n == null) return "—"
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"
  return n.toLocaleString()
}
