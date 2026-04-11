import { cn } from "@/lib/utils"

interface DividerProps {
  light?: boolean
  className?: string
}

export function Divider({ light = false, className }: DividerProps) {
  return (
    <div
      className={cn("h-20", className)}
      style={{
        background: light
          ? "linear-gradient(90deg, transparent, var(--color-lt-line) 20%, var(--color-lt-line) 80%, transparent)"
          : "linear-gradient(90deg, transparent, var(--color-dk-line) 20%, var(--color-dk-line) 80%, transparent)",
      }}
    />
  )
}