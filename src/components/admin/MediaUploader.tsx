"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  attachConsentProof,
  createConsentUploadTicket,
  createUploadTicket,
  registerUploadedMedia,
} from "@/app/(operateurs)/admin/medias/actions"

type Kind = "image" | "video" | "poster" | "subtitles"

async function readImageSize(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith("image/")) return {}
  try {
    const bmp = await createImageBitmap(file)
    const size = { width: bmp.width, height: bmp.height }
    bmp.close()
    return size
  } catch {
    return {}
  }
}

async function readVideoMeta(file: File): Promise<{ width?: number; height?: number; durationSeconds?: number }> {
  if (file.type !== "video/mp4") return {}
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement("video")
    v.preload = "metadata"
    v.onloadedmetadata = () => {
      resolve({ width: v.videoWidth || undefined, height: v.videoHeight || undefined, durationSeconds: Number.isFinite(v.duration) ? v.duration : undefined })
      URL.revokeObjectURL(url)
    }
    v.onerror = () => {
      resolve({})
      URL.revokeObjectURL(url)
    }
    v.src = url
  })
}

/**
 * Import direct vers le bucket privé via une URL signée émise par le serveur
 * (contrôle type/taille avant ET après l'envoi). Aucun fichier ne transite
 * par une URL publique.
 */
export function MediaUploader() {
  const router = useRouter()
  const [kind, setKind] = useState<Kind>("image")
  const [status, setStatus] = useState<string>("")
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return setStatus("Choisissez un fichier.")
    const mimeType = file.type || (file.name.endsWith(".vtt") ? "text/vtt" : "")
    setBusy(true)
    setStatus("Préparation…")
    try {
      const ticket = await createUploadTicket({ kind, mimeType, size: file.size })
      if (!ticket.ok) return setStatus(ticket.error)
      setStatus("Envoi du fichier…")
      const supabase = createClient()
      const { error } = await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: mimeType })
      if (error) return setStatus("L'envoi a échoué. Réessayez.")
      const meta = kind === "video" ? await readVideoMeta(file) : await readImageSize(file)
      const res = await registerUploadedMedia({ kind, path: ticket.path, ...meta })
      if (!res.ok || !res.id) return setStatus(res.error ?? "Enregistrement impossible.")
      router.push(`/admin/medias/${res.id}?uploaded=1`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="adm-fieldset" style={{ marginBottom: "2rem" }}>
      <legend>Importer un média</legend>
      <div className="adm-field">
        <label htmlFor="kind">Type</label>
        <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          <option value="image">Photo (JPEG, PNG, WebP, AVIF — 15 Mo max)</option>
          <option value="video">Vidéo MP4 déjà optimisée (200 Mo max)</option>
          <option value="poster">Affiche de vidéo</option>
          <option value="subtitles">Sous-titres WebVTT (.vtt)</option>
        </select>
      </div>
      <div className="adm-field">
        <label htmlFor="file">Fichier</label>
        <input id="file" name="file" type="file" className="adm-input" accept={kind === "video" ? "video/mp4" : kind === "subtitles" ? ".vtt,text/vtt" : "image/jpeg,image/png,image/webp,image/avif"} />
      </div>
      <div className="adm-full adm-actions">
        <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>{busy ? "Import…" : "Importer"}</button>
        {status && <span className="adm-muted" role="status">{status}</span>}
      </div>
      <p className="adm-full adm-muted" style={{ margin: 0 }}>
        Le fichier reste privé. Il n&apos;est diffusé qu&apos;après approbation de ses droits ET publication d&apos;un contenu qui l&apos;utilise.
      </p>
    </form>
  )
}

/** Envoi d'une preuve d'autorisation (bucket privé bib-consents). */
export function ConsentUploader({ mediaId }: { mediaId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState("")
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem("proof") as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return setStatus("Choisissez un fichier.")
    const ticket = await createConsentUploadTicket({ mediaId, mimeType: file.type, size: file.size })
    if (!ticket.ok) return setStatus(ticket.error)
    const supabase = createClient()
    const { error } = await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type })
    if (error) return setStatus("L'envoi a échoué.")
    const res = await attachConsentProof({ mediaId, path: ticket.path })
    if (!res.ok) return setStatus(res.error ?? "Enregistrement impossible.")
    router.refresh()
    setStatus("Preuve enregistrée.")
  }
  return (
    <form onSubmit={onSubmit} className="adm-field adm-full">
      <label htmlFor="proof">Preuve d&apos;autorisation (PDF, JPEG ou PNG — privée)</label>
      <input id="proof" name="proof" type="file" accept="application/pdf,image/jpeg,image/png" className="adm-input" />
      <div className="adm-actions">
        <button type="submit" className="adm-btn">Envoyer la preuve</button>
        {status && <span className="adm-muted" role="status">{status}</span>}
      </div>
    </form>
  )
}
