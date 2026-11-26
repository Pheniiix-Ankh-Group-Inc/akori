"use client"

import { useState } from "react"

/** Copie l'adresse actuelle (version et filtres compris) dans le presse-papiers. */
export function CopyLink({ label, done }: { label: string; done: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="im-link"
      style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer", color: "inherit" }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href)
          setCopied(true)
          setTimeout(() => setCopied(false), 2400)
        } catch {
          setCopied(false)
        }
      }}
    >
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  )
}
