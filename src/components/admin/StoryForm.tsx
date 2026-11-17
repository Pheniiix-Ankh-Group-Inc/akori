"use client"

import { useActionState } from "react"
import { saveStory, type FormState } from "@/app/(operateurs)/admin/en-action/actions"
import type { MediaOption } from "./EventForm"

export interface StoryFormValues {
  id?: string
  /** Horodatage lu à l'ouverture : contrôle de modification concurrente. */
  updated_at?: string
  slug: string
  occurred_on: string
  event_id: string
  cover_media_id: string
  featured_video_id: string
  translations: Record<string, { title: string; summary: string; body: string; seo: string }>
}

const LOCALES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
]

export function StoryForm({
  values,
  images,
  videos,
  events,
}: {
  values: StoryFormValues
  images: MediaOption[]
  videos: MediaOption[]
  events: MediaOption[]
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveStory, {})
  return (
    <form action={action} className="adm-form">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {values.updated_at && <input type="hidden" name="expected_updated_at" value={values.updated_at} />}
      {state.error && (
        <div className="adm-notice adm-notice-error" role="alert">
          <p style={{ margin: 0 }}>{state.error}</p>
          {state.issues && <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>{state.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
        </div>
      )}
      <fieldset className="adm-fieldset">
        <legend>Rétrospective</legend>
        <div className="adm-field">
          <label htmlFor="slug">Identifiant d&apos;URL (obligatoire)</label>
          <input id="slug" name="slug" className="adm-input" required defaultValue={values.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </div>
        <div className="adm-field">
          <label htmlFor="occurred_on">Date de la rencontre (facultatif)</label>
          <input id="occurred_on" name="occurred_on" type="date" className="adm-input" defaultValue={values.occurred_on} />
        </div>
        <div className="adm-field adm-full">
          <label htmlFor="event_id">Événement BIB lié (facultatif)</label>
          <select id="event_id" name="event_id" defaultValue={values.event_id}>
            <option value="">Aucun</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="cover_media_id">Photo de couverture</label>
          <select id="cover_media_id" name="cover_media_id" defaultValue={values.cover_media_id}>
            <option value="">Aucune</option>
            {images.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="featured_video_id">Vidéo phare (facultatif)</label>
          <select id="featured_video_id" name="featured_video_id" defaultValue={values.featured_video_id}>
            <option value="">Aucune</option>
            {videos.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <small>MP4 préparé avant import ; affiche et sous-titres se règlent dans Médias.</small>
        </div>
      </fieldset>
      {LOCALES.map(({ code, label }) => {
        const t = values.translations[code] ?? { title: "", summary: "", body: "", seo: "" }
        return (
          <fieldset key={code} className="adm-fieldset">
            <legend>Textes — {label}</legend>
            <div className="adm-field adm-full">
              <label htmlFor={`title_${code}`}>Titre</label>
              <input id={`title_${code}`} name={`title_${code}`} className="adm-input" maxLength={200} defaultValue={t.title} />
              <small>Laissez vide si le texte n&apos;existe pas dans cette langue : aucune traduction n&apos;est générée.</small>
            </div>
            <div className="adm-field adm-full">
              <label htmlFor={`summary_${code}`}>Résumé</label>
              <textarea id={`summary_${code}`} name={`summary_${code}`} maxLength={500} defaultValue={t.summary} rows={2} />
            </div>
            <div className="adm-field adm-full">
              <label htmlFor={`body_${code}`}>Récit</label>
              <textarea id={`body_${code}`} name={`body_${code}`} maxLength={20000} defaultValue={t.body} />
            </div>
            <div className="adm-field adm-full">
              <label htmlFor={`seo_${code}`}>Description pour les moteurs de recherche</label>
              <input id={`seo_${code}`} name={`seo_${code}`} className="adm-input" maxLength={300} defaultValue={t.seo} />
            </div>
          </fieldset>
        )
      })}
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </form>
  )
}
