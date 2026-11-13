"use client"

import { useRef, useState } from "react"
import type { MediaView } from "./types"

/**
 * Galerie : vignettes chargées en différé ; un clic ouvre la photo en grand
 * dans une boîte de dialogue native (fermeture par Échap ou bouton).
 */
export function Gallery({ items, closeLabel }: { items: { media: MediaView; caption: string }[]; closeLabel: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [current, setCurrent] = useState<number | null>(null)
  const open = (i: number) => {
    setCurrent(i)
    dialogRef.current?.showModal()
  }
  const item = current !== null ? items[current] : null

  return (
    <>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
        {items.map(({ media, caption }, i) => (
          <li key={media.id}>
            <button
              type="button"
              onClick={() => open(i)}
              style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none", cursor: "zoom-in" }}
              aria-label={media.alt || caption}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage */}
              <img src={media.url} alt={media.alt} loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "var(--r)" }} />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        onClose={() => setCurrent(null)}
        style={{ maxWidth: "min(1100px, 95vw)", padding: 0, border: "1px solid var(--border-h)", background: "var(--bg)", color: "var(--blanc)" }}
      >
        {item && (
          <figure style={{ margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage */}
            <img src={item.media.url} alt={item.media.alt} style={{ display: "block", maxWidth: "100%", maxHeight: "80vh", margin: "0 auto" }} />
            <figcaption className="text-sm" style={{ padding: "0.75rem 1rem" }}>
              {item.caption}
              {item.media.credit && <span className="text-xs"> · © {item.media.credit}</span>}
            </figcaption>
          </figure>
        )}
        <form method="dialog" style={{ padding: "0 1rem 1rem" }}>
          <button className="tag" type="submit">{closeLabel}</button>
        </form>
      </dialog>
    </>
  )
}
