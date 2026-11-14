import { saveTestimonial } from "@/app/(operateurs)/admin/temoignages/actions"
import type { MediaOption } from "./EventForm"

export interface TestimonialValues {
  id?: string
  story_id: string
  event_id: string
  locale: string
  quote: string
  author_name: string
  author_role: string
  consent_reference: string
  position: number
}

export function TestimonialForm({ values, stories, events }: { values: TestimonialValues; stories: MediaOption[]; events: MediaOption[] }) {
  return (
    <form action={saveTestimonial} className="adm-form">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <fieldset className="adm-fieldset">
        <legend>Témoignage</legend>
        <div className="adm-field adm-full">
          <label htmlFor="quote">Citation exacte (obligatoire)</label>
          <textarea id="quote" name="quote" required maxLength={1200} defaultValue={values.quote} />
          <small>Texte tel que fourni par son auteur, dans sa langue d&apos;origine.</small>
        </div>
        <div className="adm-field">
          <label htmlFor="locale">Langue de la citation</label>
          <select id="locale" name="locale" defaultValue={values.locale}>
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="position">Ordre d&apos;affichage</label>
          <input id="position" name="position" type="number" min={0} className="adm-input" defaultValue={values.position} />
        </div>
        <div className="adm-field">
          <label htmlFor="author_name">Nom de l&apos;auteur (obligatoire)</label>
          <input id="author_name" name="author_name" required maxLength={120} className="adm-input" defaultValue={values.author_name} />
        </div>
        <div className="adm-field">
          <label htmlFor="author_role">Rôle ou organisation (facultatif)</label>
          <input id="author_role" name="author_role" maxLength={160} className="adm-input" defaultValue={values.author_role} />
        </div>
        <div className="adm-field adm-full">
          <label htmlFor="consent_reference">Référence du consentement écrit (obligatoire)</label>
          <input id="consent_reference" name="consent_reference" required maxLength={300} className="adm-input" defaultValue={values.consent_reference} />
          <small>Ex. « Accord signé le 2026-11-20, dossier BIB-T-004 ». Ne saisissez aucune donnée personnelle superflue.</small>
        </div>
        <div className="adm-field">
          <label htmlFor="story_id">Rétrospective liée</label>
          <select id="story_id" name="story_id" defaultValue={values.story_id}>
            <option value="">Aucune</option>
            {stories.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="event_id">Événement lié</label>
          <select id="event_id" name="event_id" defaultValue={values.event_id}>
            <option value="">Aucun</option>
            {events.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </fieldset>
      <div className="adm-actions"><button className="adm-btn adm-btn-primary" type="submit">Enregistrer</button></div>
    </form>
  )
}
