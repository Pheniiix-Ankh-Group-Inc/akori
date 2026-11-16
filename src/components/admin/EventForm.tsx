"use client"

import { useActionState } from "react"
import { saveEvent, type FormState } from "@/app/(operateurs)/admin/evenements/actions"

export interface EventFormValues {
  id?: string
  /** Horodatage lu à l'ouverture : contrôle de modification concurrente. */
  updated_at?: string
  slug: string
  time_zone: string
  starts_local: string
  ends_local: string
  mode: string
  venue_name: string
  address: string
  city: string
  country_code: string
  online_url: string
  luma_url: string
  cover_media_id: string
  translations: Record<string, { title: string; summary: string; description: string }>
}

export interface MediaOption {
  id: string
  label: string
}

const LOCALES: { code: string; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
]

export function EventForm({ values, mediaOptions }: { values: EventFormValues; mediaOptions: MediaOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveEvent, {})

  return (
    <form action={action} className="adm-form">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {values.updated_at && <input type="hidden" name="expected_updated_at" value={values.updated_at} />}

      {state.error && (
        <div className="adm-notice adm-notice-error" role="alert">
          <p style={{ margin: 0 }}>{state.error}</p>
          {state.issues && (
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
              {state.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <fieldset className="adm-fieldset">
        <legend>Informations pratiques</legend>
        <div className="adm-field">
          <label htmlFor="slug">Identifiant d&apos;URL (obligatoire)</label>
          <input id="slug" name="slug" className="adm-input" required defaultValue={values.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          <small>Ex. rencontre-montreal-2027 → /evenements/rencontre-montreal-2027</small>
        </div>
        <div className="adm-field">
          <label htmlFor="time_zone">Fuseau horaire de l&apos;événement (obligatoire)</label>
          <input id="time_zone" name="time_zone" className="adm-input" required defaultValue={values.time_zone} />
          <small>Nom IANA, ex. America/Toronto, Africa/Lagos, America/Jamaica.</small>
        </div>
        <div className="adm-field">
          <label htmlFor="starts_local">Début, heure locale (obligatoire)</label>
          <input id="starts_local" name="starts_local" type="datetime-local" className="adm-input" required defaultValue={values.starts_local} />
        </div>
        <div className="adm-field">
          <label htmlFor="ends_local">Fin, heure locale (facultatif)</label>
          <input id="ends_local" name="ends_local" type="datetime-local" className="adm-input" defaultValue={values.ends_local} />
        </div>
        <div className="adm-field">
          <label htmlFor="mode">Format</label>
          <select id="mode" name="mode" defaultValue={values.mode}>
            <option value="in_person">Présentiel</option>
            <option value="online">En ligne</option>
            <option value="hybrid">Hybride</option>
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="online_url">Lien de diffusion en ligne (facultatif)</label>
          <input id="online_url" name="online_url" type="url" className="adm-input" placeholder="https://" defaultValue={values.online_url} />
        </div>
        <div className="adm-field">
          <label htmlFor="venue_name">Lieu (facultatif)</label>
          <input id="venue_name" name="venue_name" className="adm-input" defaultValue={values.venue_name} />
        </div>
        <div className="adm-field">
          <label htmlFor="address">Adresse (facultatif)</label>
          <input id="address" name="address" className="adm-input" defaultValue={values.address} />
        </div>
        <div className="adm-field">
          <label htmlFor="city">Ville (facultatif)</label>
          <input id="city" name="city" className="adm-input" defaultValue={values.city} />
        </div>
        <div className="adm-field">
          <label htmlFor="country_code">Pays, code ISO (facultatif)</label>
          <input id="country_code" name="country_code" className="adm-input" maxLength={2} defaultValue={values.country_code} />
        </div>
        <div className="adm-field adm-full">
          <label htmlFor="luma_url">Lien d&apos;inscription Luma (facultatif)</label>
          <input id="luma_url" name="luma_url" type="url" className="adm-input" placeholder="https://lu.ma/…" defaultValue={values.luma_url} />
          <small>
            Copiez l&apos;URL officielle de CET événement sur Luma. Le bouton « S&apos;inscrire sur Luma » n&apos;apparaît que si ce lien est renseigné.
            Aucune donnée n&apos;est importée depuis Luma.
          </small>
        </div>
        <div className="adm-field adm-full">
          <label htmlFor="cover_media_id">Visuel (facultatif)</label>
          <select id="cover_media_id" name="cover_media_id" defaultValue={values.cover_media_id}>
            <option value="">Aucun</option>
            {mediaOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <small>Seules les images importées dans Médias apparaissent ; elles ne sont diffusées que si leurs droits sont approuvés.</small>
        </div>
      </fieldset>

      {LOCALES.map(({ code, label }) => {
        const t = values.translations[code] ?? { title: "", summary: "", description: "" }
        return (
          <fieldset key={code} className="adm-fieldset">
            <legend>Textes — {label}</legend>
            <div className="adm-field adm-full">
              <label htmlFor={`title_${code}`}>Titre</label>
              <input id={`title_${code}`} name={`title_${code}`} className="adm-input" maxLength={200} defaultValue={t.title} />
              <small>Laissez vide si ce texte n&apos;est pas disponible dans cette langue.</small>
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
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  )
}
