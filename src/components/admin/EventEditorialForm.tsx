"use client"

import { useActionState } from "react"
import { saveEventEditorial, type FormState } from "@/app/(operateurs)/admin/evenements/actions"
import type { MediaOption } from "@/components/admin/EventForm"

const LOCALES: { code: string; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
]

/**
 * Compléments éditoriaux BIB d'un événement Luma : visuel et textes par langue.
 * Les champs importés de Luma ne sont pas modifiables ici (lecture seule).
 */
export function EventEditorialForm({
  id,
  updatedAt,
  coverMediaId,
  translations,
  mediaOptions,
}: {
  id: string
  updatedAt: string
  coverMediaId: string
  translations: Record<string, { title: string; summary: string; description: string }>
  mediaOptions: MediaOption[]
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveEventEditorial, {})
  return (
    <form action={action} className="adm-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="expected_updated_at" value={updatedAt} />
      {state.error && (
        <div className="adm-notice adm-notice-error" role="alert">
          <p style={{ margin: 0 }}>{state.error}</p>
          {state.issues && (
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
              {state.issues.map((i) => <li key={i}>{i}</li>)}
            </ul>
          )}
        </div>
      )}
      <fieldset className="adm-fieldset">
        <legend>Visuel BIB</legend>
        <div className="adm-field adm-full">
          <label htmlFor="cover_media_id">Visuel (facultatif)</label>
          <select id="cover_media_id" name="cover_media_id" defaultValue={coverMediaId}>
            <option value="">Aucun — le visuel public Luma est utilisé s&apos;il existe</option>
            {mediaOptions.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <small>Seules les images de Médias dont les droits sont approuvés sont diffusées.</small>
        </div>
      </fieldset>
      {LOCALES.map(({ code, label }) => {
        const t = translations[code] ?? { title: "", summary: "", description: "" }
        return (
          <fieldset key={code} className="adm-fieldset">
            <legend>Texte éditorial — {label}</legend>
            <div className="adm-field adm-full">
              <label htmlFor={`title_${code}`}>Titre</label>
              <input id={`title_${code}`} name={`title_${code}`} className="adm-input" maxLength={200} defaultValue={t.title} />
              <small>Vide : le titre Luma est affiché.</small>
            </div>
            <div className="adm-field adm-full">
              <label htmlFor={`summary_${code}`}>Résumé</label>
              <textarea id={`summary_${code}`} name={`summary_${code}`} maxLength={500} defaultValue={t.summary} rows={2} />
            </div>
            <div className="adm-field adm-full">
              <label htmlFor={`description_${code}`}>Description</label>
              <textarea id={`description_${code}`} name={`description_${code}`} maxLength={10000} defaultValue={t.description} />
            </div>
          </fieldset>
        )
      })}
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer les compléments"}</button>
      </div>
    </form>
  )
}
