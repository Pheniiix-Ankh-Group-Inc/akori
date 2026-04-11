"use client"
import Link from "next/link"
import { useScrollProgress } from "@/../src/components/hooks/Usescrollprogress"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { label: "mission",    href: "#mission"    },
  { label: "partners",   href: "#partners"   },
  { label: "events",     href: "#events"     },
  { label: "resources",  href: "#resources"  },
  { label: "membership", href: "#membership" },
  { label: "about",      href: "#about"      },
]

export function Navbar() {
  const { progress, scrolled } = useScrollProgress()

  return (
    <header
      className={cn(
        "sticky top-0 z-150 h-[5.85rem] flex items-center w-full transition-all duration-400 ease-out",
        scrolled 
          ? "bg-[rgba(8,9,9,0.85)] backdrop-blur-[20px]" 
          : "bg-transparent border-transparent"
      )}
    >
      <div className="container-site w-full flex items-center justify-between">
        
        {/* Logo / Brand - Identique à la maquette */}
        <Link href="/" className="flex items-center gap-[0.7rem] group">
          <div className="w-[1.85rem] h-[1.85rem] rounded-sm bg-gold flex items-center justify-center text-[0.8rem] text-dk font-bold transition-transform duration-500 group-hover:rotate-180">
            ⬡
          </div>
          <span className="font-serif text-[1.1rem] tracking-[-0.01em] text-snow font-extralight">
            AnbaChain
          </span>
        </Link>

        {/* Navigation Desktop */}
        <nav className="hidden md:flex items-center gap-[2.2rem]">
          <ul className="flex items-center gap-[1.8rem] list-none">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-[0.79rem] text-muted2 tracking-[0.04em] font-normal lowercase hover:text-snow transition-colors duration-300"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Bouton Call-to-Action spécifique Navbar */}
          <a
            href="#membership"
            className="text-[0.74rem] text-gold border border-[rgba(196,151,92,0.3)] rounded-xs px-[1.1rem] py-[0.45rem] tracking-[0.05em] uppercase transition-all duration-300 hover:bg-gold-dim hover:border-gold"
          >
            rejoindre
          </a>
        </nav>

        {/* Mobile Toggle (Simple placeholder pour respecter la structure) */}
        <button className="md:hidden text-snow p-2">
          <div className="w-5 h-px bg-current mb-1.5" />
          <div className="w-5 h-px bg-current" />
        </button>
      </div>

      {/* Scroll Progress Line - Positionnée exactement sous la bordure */}
      <div className="absolute -bottom-px left-0 w-full h-px bg-dkLine">
        <div
          className="h-full bg-gold transition-all duration-150 ease-linear shadow-[0_0_8px_rgba(196,151,92,0.4)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  )
}