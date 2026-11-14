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
      <ul className="ed-gallery" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map(({ media, caption }, i) => (
          <li key={media.id}>
            <button
              type="button"
              onClick={() => open(i)}
              style={{ width: "100%" }}
              aria-label={media.alt || caption}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage */}
              <img src={media.url} alt={media.alt} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        onClose={() => setCurrent(null)}
        className="ed-dialog"
      >
        {item && (
          <figure style={{ margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- fichiers Supabase Storage */}
            <img src={item.media.url} alt={item.media.alt} style={{ display: "block", maxWidth: "100%", maxHeight: "80vh", margin: "0 auto" }} />
            <figcaption className="ed-muted" style={{ padding: "0.75rem 1rem" }}>
              {item.caption}
              {item.media.credit && <span> · © {item.media.credit}</span>}
            </figcaption>
          </figure>
        )}
        <form method="dialog" style={{ padding: "0 1rem 1rem" }}>
          <button className="ed-btn ed-btn-line" type="submit">{closeLabel}</button>
        </form>
      </dialog>
    </>
  )
}
