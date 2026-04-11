"use client"
import { forwardRef, ButtonHTMLAttributes, AnchorHTMLAttributes } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Variant = "prim" | "sec" | "ghost-lt"

interface BaseProps {
  variant?: Variant
  arrow?: boolean
  className?: string
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }
type LinkProps   = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement>  & { href: string }
type Props = ButtonProps | LinkProps

// Base : .btn dans la maquette
const base = "inline-flex items-center gap-[0.5rem] font-sans text-[0.79rem] font-normal tracking-[0.04em] cursor-pointer transition-all duration-[280ms] ease-out relative whitespace-nowrap select-none group"

const variants: Record<Variant, string> = {
  // .btn-prim
  "prim": [
    "text-gold border border-[rgba(196,151,92,0.45)] rounded-[2px] px-[1.35rem] py-[0.6rem] bg-transparent overflow-hidden",
    // Remplissage progressif : .btn-prim::after
    "after:content-[''] after:absolute after:inset-0 after:bg-gold after:scale-x-0 after:origin-left after:transition-transform after:duration-300 after:ease-out after:z-0",
    "hover:after:scale-x-100",
    // Changement de couleur du texte au survol
    "hover:text-dk", 
  ].join(" "),

  // .btn-sec
  "sec": [
    "text-snow2 px-0 py-[0.6rem] border-none bg-none relative",
    // Soulignement : .btn-sec::after
    "after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-snow2 after:transition-[width] after:duration-300 after:ease-out",
    "hover:after:w-full hover:text-snow",
  ].join(" "),

  // .btn-ghost-lt
  "ghost-lt": [
    "text-ltInk2 border border-ltLineH rounded-[2px] px-[1.35rem] py-[0.6rem] bg-transparent overflow-hidden",
    // .btn-ghost-lt::after
    "after:content-[''] after:absolute after:inset-0 after:bg-ltInk after:scale-x-0 after:origin-left after:transition-transform after:duration-300 after:ease-out after:z-0",
    "hover:after:scale-x-100 hover:text-white",
  ].join(" "),
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  ({ variant = "prim", arrow = true, className, children, ...props }, ref) => {
    const cls = cn(base, variants[variant], className)

    const inner = (
      <>
        {/* Texte : z-index 1 obligatoire pour être au dessus du after doré */}
        <span className="relative z-1 transition-colors duration-300 pointer-events-none">
          {children}
        </span>
        
        {/* Flèche : .arr dans la maquette */}
        {arrow && (
          <span className="relative z-1 inline-block transition-transform duration-250 ease-out group-hover:translate-x-0.75 pointer-events-none">
            →
          </span>
        )}
      </>
    )

    if ("href" in props && props.href !== undefined) {
      const { href, ...rest } = props as LinkProps
      return (
        <Link href={href} className={cls} ref={ref as React.Ref<HTMLAnchorElement>} {...rest}>
          {inner}
        </Link>
      )
    }

    return (
      <button className={cls} ref={ref as React.Ref<HTMLButtonElement>} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
        {inner}
      </button>
    )
  }
)

Button.displayName = "Button"