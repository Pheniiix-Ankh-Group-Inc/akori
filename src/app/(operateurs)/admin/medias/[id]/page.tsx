import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { z } from "zod"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { createDraftPreviewUrl } from "@/lib/media/preview"
import { listMediaOptions } from "@/lib/admin/queries"
import { Notice } from "@/components/admin/Notice"
import { ConsentUploader } from "@/components/admin/MediaUploader"
import { deleteMediaAction, saveMediaDetails } from "../actions"

export const metadata: Metadata = { title: "Média" }

interface MediaRow {
  id: string
  kind: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  duration_seconds: number | null
  alt_text: Record<string, string>
  credit: string | null
  rights_holder: string | null
  rights_reference: string | null
  rights_status: string
  consent_proof_path: string | null
  public_path: string | null
  poster_media_id: string | null
  subtitles_media_id: string | null
}

export default async function MediaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireEditor()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const query = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from("media_assets").select("*").eq("id", id).maybeSingle()
  if (!data) notFound()
  const m = data as MediaRow
  const preview = await createDraftPreviewUrl(m.id)
  const [posters, subtitles] = m.kind === "video" ? await Promise.all([listMediaOptions(["poster", "image"]), listMediaOptions(["subtitles"])]) : [[], []]

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb"><Link href="/admin/medias">Médias</Link> › Détail</p>
          <h1>{m.kind === "video" ? "Vidéo" : m.kind === "subtitles" ? "Sous-titres" : m.kind === "poster" ? "Affiche" : "Photo"}</h1>
          <p className="adm-muted">
            {m.mime_type} · {(m.size_bytes / 1048576).toFixed(1)} Mo{m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
            {m.duration_seconds ? ` · ${Math.round(m.duration_seconds)} s` : ""} · {m.public_path ? "diffusé publiquement" : "privé"}
          </p>
        </div>
        <form action={deleteMediaAction}>
          <input type="hidden" name="id" value={m.id} />
          <button className="adm-btn adm-btn-danger" type="submit">Supprimer</button>
        </form>
      </div>
      <Notice params={query} />

      {preview && (m.kind === "image" || m.kind === "poster") && (
        // eslint-disable-next-line @next/next/no-img-element -- URL signée privée, temporaire
        <img src={preview} alt="" style={{ maxWidth: "100%", maxHeight: 360, borderRadius: "var(--r)", marginBottom: "1.5rem" }} />
      )}
      {preview && m.kind === "video" && (
        <video src={preview} controls preload="metadata" style={{ maxWidth: "100%", maxHeight: 360, marginBottom: "1.5rem" }} />
      )}

      <form action={saveMediaDetails} className="adm-form">
        <input type="hidden" name="id" value={m.id} />
        <fieldset className="adm-fieldset">
          <legend>Textes alternatifs (obligatoires pour une photo publiée)</legend>
          {(["fr", "en", "es"] as const).map((l) => (
            <div key={l} className="adm-field adm-full">
              <label htmlFor={`alt_${l}`}>Description de l&apos;image — {l.toUpperCase()}</label>
              <input id={`alt_${l}`} name={`alt_${l}`} className="adm-input" maxLength={500} defaultValue={m.alt_text?.[l] ?? ""} />
            </div>
          ))}
        </fieldset>
        <fieldset className="adm-fieldset">
          <legend>Droits et autorisations</legend>
          <div className="adm-field">
            <label htmlFor="credit">Crédit affiché</label>
            <input id="credit" name="credit" className="adm-input" maxLength={200} defaultValue={m.credit ?? ""} />
          </div>
          <div className="adm-field">
            <label htmlFor="rights_holder">Titulaire des droits</label>
            <input id="rights_holder" name="rights_holder" className="adm-input" maxLength={200} defaultValue={m.rights_holder ?? ""} />
          </div>
          <div className="adm-field">
            <label htmlFor="rights_reference">Référence d&apos;autorisation (obligatoire pour approuver)</label>
            <input id="rights_reference" name="rights_reference" className="adm-input" maxLength={300} defaultValue={m.rights_reference ?? ""} />
          </div>
          <div className="adm-field">
            <label htmlFor="rights_status">Statut des droits</label>
            <select id="rights_status" name="rights_status" defaultValue={m.rights_status}>
              <option value="pending">En attente</option>
              <option value="approved">Approuvés — diffusion autorisée</option>
              <option value="rejected">Refusés</option>
              <option value="revoked">Révoqués — retrait immédiat du site</option>
            </select>
          </div>
          {m.kind === "video" && (
            <>
              <div className="adm-field">
                <label htmlFor="poster_media_id">Affiche de la vidéo</label>
                <select id="poster_media_id" name="poster_media_id" defaultValue={m.poster_media_id ?? ""}>
                  <option value="">Aucune</option>
                  {posters.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div className="adm-field">
                <label htmlFor="subtitles_media_id">Sous-titres</label>
                <select id="subtitles_media_id" name="subtitles_media_id" defaultValue={m.subtitles_media_id ?? ""}>
                  <option value="">Aucun</option>
                  {subtitles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </>
          )}
          {m.kind !== "video" && (
            <>
              <input type="hidden" name="poster_media_id" value="" />
              <input type="hidden" name="subtitles_media_id" value="" />
            </>
          )}
          <p className="adm-full adm-muted" style={{ margin: 0 }}>
            Preuve d&apos;autorisation : {m.consent_proof_path ? "enregistrée (privée)" : "aucune"}.
          </p>
        </fieldset>
        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn-primary">Enregistrer</button>
        </div>
      </form>
      <div className="adm-fieldset" style={{ marginTop: "1.5rem" }}>
        <ConsentUploader mediaId={m.id} />
      </div>
    </>
  )
}
