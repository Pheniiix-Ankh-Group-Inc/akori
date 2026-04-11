import { cn } from "@/lib/utils"

interface TagProps {
  children: React.ReactNode
  light?: boolean
  className?: string
}

export function Tag({ children, light = false, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[.45rem] text-[.66rem] font-medium tracking-[.18em] uppercase",
        "before:block before:w-[1.4rem] before:h-px",
        light
          ? "text-gold-lt before:bg-gold-lt"
          : "text-gold before:bg-gold",
        className
      )}
    >
      {children}
    </span>
  )
}