"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"

type BtnVariant = "white" | "ghost" | "accent"

interface ButtonProps {
  variant?: BtnVariant
  href?: string
  external?: boolean
  className?: string
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
  ariaPressed?: boolean
}

const variantStyles: Record<BtnVariant, string> = {
  white:  "bg-[var(--blanc)] text-[var(--bg)] hover:bg-white hover:-translate-y-0.5",
  ghost:  "bg-transparent text-[var(--texte-2)] border border-[var(--border)] hover:border-[var(--border-h)] hover:text-[var(--blanc)]",
  accent: "bg-[var(--accent)] text-[var(--bg)] font-semibold hover:bg-[#d4b882] hover:-translate-y-0.5",
}

const base = [
  "inline-flex items-center gap-2",
  "px-[1.9rem] py-[0.8rem]",
  // "rounded-full",
  "font-sans text-[0.83rem] font-medium tracking-[0.01em]",
  "cursor-pointer border-none",
  "transition-all duration-[350ms]",
  "whitespace-nowrap",
].join(" ")

export function Button({
  variant = "white",
  href,
  external,
  className,
  children,
  onClick,
  disabled,
  ariaLabel,
  ariaPressed,
}: ButtonProps) {
  const cls = cn(base, variantStyles[variant], className)

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {children}
        </a>
      )
    }
    return <Link href={href} className={cls}>{children}</Link>
  }

  return (
    <button 
      className={cls} 
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
    >
      {children}
    </button>
  )
}