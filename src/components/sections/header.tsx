"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { NAV_LINKS } from "@/lib/design-tokens"

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)

  // ✅ Verrouiller le scroll du body via classe CSS
  useEffect(() => {
    if (menuOpen) {
      document.documentElement.style.overflow = "hidden"
    } else {
      document.documentElement.style.overflow = ""
    }
    return () => {
      document.documentElement.style.overflow = ""
    }
  }, [menuOpen])

  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [menuOpen])

 
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !burgerRef.current?.contains(target)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [menuOpen])

  
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  
  const handleNavClick = () => {
    setMenuOpen(false)
  }

  return (
    <>
      <header id="hdr" className={scrolled ? "scrolled" : ""}>
        <Link href="/" className="logo">
          Ako<em>ri</em>
        </Link>

        <nav className="hdr-nav">
          <ul>
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hdr-actions">
          <Button variant="ghost" href="/login">Sign in</Button>
          <Button variant="white" href="/register">Join</Button>
        </div>

        <button
          ref={burgerRef}
          className={`hdr-burger${menuOpen ? " open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="hdr-burger-line hdr-burger-line-1" />
          <span className="hdr-burger-line hdr-burger-line-2" />
          <span className="hdr-burger-line hdr-burger-line-3" />
        </button>
      </header>

      <div 
        ref={menuRef}
        className={`hdr-mobile-menu${menuOpen ? " open" : ""}`}
        role="navigation"
        aria-hidden={!menuOpen}
      >
        <div className="hdr-mobile-menu-inner">
          <ul>
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="hdr-mobile-nav-link"
                  onClick={handleNavClick}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="hdr-mobile-actions">
            <Button variant="ghost" href="/login">Sign in</Button>
            <Button variant="white" href="/register">Join</Button>
          </div>
        </div>
      </div>
    </>
  )
}