// src/components/ui/LocaleSwitcher.tsx
"use client"

import { useLocale } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

const LOCALES: { code: string; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
]

export function LocaleSwitcher() {
  const locale   = useLocale()
  const router   = useRouter()
  const pathname = usePathname()

  function handleChange(newLocale: string) {
    if (newLocale === locale) return
    router.replace(pathname, { locale: newLocale })
    router.refresh()
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Changer de langue"
        style={{
          appearance: "none",
          color: "var(--texte)",
          fontFamily: "var(--font-sans)",
          fontSize: "0.78rem",
          padding: "0.1rem 2.2rem 0.1rem 0.9rem",
          cursor: "pointer",
          outline: "none",
        }}
        onMouseEnter={(e) =>
          ((e.target as HTMLSelectElement).style.borderColor = "rgba(255,255,255,0.22)")
        }
        onMouseLeave={(e) =>
          ((e.target as HTMLSelectElement).style.borderColor = "var(--border)")
        }
      >
        {LOCALES.map(({ code, flag }) => (
          <option
            key={code}
            value={code}
            style={{  color: "var(--blanc)" }}
          >
            {flag}
          </option>
        ))}
      </select>
    </div>
  )
}