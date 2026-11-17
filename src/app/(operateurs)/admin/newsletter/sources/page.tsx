import Link from "next/link"
import type { Metadata } from "next"
import { requireEditor } from "@/lib/auth/editor"
import { createClient } from "@/lib/supabase/server"
import { env, isSupabaseAdminConfigured } from "@/lib/env"
import { Notice } from "@/components/admin/Notice"
import { addSourceAction, collectNowAction, toggleSourceAction } from "./actions"

export const metadata: Metadata = { title: "Newsletter — sources d'actualité" }

type Source = { id: string; name: string; feed_url: string; homepage_url: string | null; language: string | null; region_tags: string[]; usage_terms: string; enabled: boolean; authorized_by: string | null; authorized_at: string | null; last_status: string | null; last_fetched_at: string | null }

const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(iso)) : "—")
const sevenDaysAgo = () => new Date(Date.now() - 7 * 86400000).toISOString()
const REGIONS: [string, string][] = [["africa", "Afrique"], ["caribbean", "Caraïbes"], ["diaspora", "Diaspora"], ["global", "Monde"]]

/**
 * Sources d'actualité (flux RSS/Atom) de la rubrique Blockchain News.
 * Une source n'est enregistrée qu'après lecture réelle de son flux, et
 * n'alimente la newsletter qu'une fois activée par un administrateur qui en a
 * vérifié les conditions de réutilisation.
 */
export default async function NewsSourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const editor = await requireEditor()
  const params = await searchParams
  const isAdmin = editor.role === "admin"
  const supabase = await createClient()
  const since = sevenDaysAgo()
  const [{ data }, { count: recent }] = await Promise.all([
    supabase.from("news_sources").select("id, name, feed_url, homepage_url, language, region_tags, usage_terms, enabled, authorized_by, authorized_at, last_status, last_fetched_at").order("name"),
    supabase.from("news_items").select("id", { count: "exact", head: true }).gte("fetched_at", since),
  ])
  const sources = (data ?? []) as Source[]
  const active = sources.filter((s) => s.enabled).length

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumb"><Link href="/admin/newsletter">Newsletter</Link> › Sources d&apos;actualité</p>
          <h1>Sources d&apos;actualité</h1>
          <p className="adm-muted">
            {active} source(s) active(s) sur {sources.length} · {recent ?? 0} article(s) collecté(s) sur 7 jours · collecte planifiée {env.flags.newsIngest ? "activée" : "désactivée (FEATURE_NEWS_INGEST)"}.
          </p>
        </div>
        {isAdmin && (
          <form action={collectNowAction} className="adm-actions">
            <button className="adm-btn adm-btn-primary" type="submit" disabled={!isSupabaseAdminConfigured() || active === 0}>Collecter maintenant</button>
          </form>
        )}
      </div>
      <Notice params={params} />
      {params.collected && <p className="adm-notice adm-notice-ok" role="status">Collecte terminée : {params.collected}.</p>}
      {sources.length === 0 && (
        <p className="adm-notice">Aucune source n&apos;est enregistrée : la rubrique Blockchain News restera vide tant qu&apos;au moins une source n&apos;aura pas été ajoutée puis activée.</p>
      )}

      {sources.length > 0 && (
        <div className="adm-scroll" style={{ marginBottom: "2rem" }}>
          <table className="adm-table">
            <thead>
              <tr><th scope="col">Source</th><th scope="col">Langue / régions</th><th scope="col">Conditions vérifiées</th><th scope="col">État</th><th scope="col">Dernière lecture</th>{isAdmin && <th scope="col">Action</th>}</tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <br />
                    <span className="adm-muted" style={{ overflowWrap: "anywhere" }}>{s.feed_url}</span>
                  </td>
                  <td>{s.language ?? "—"}<br /><span className="adm-muted">{s.region_tags.join(", ") || "—"}</span></td>
                  <td>{s.usage_terms}</td>
                  <td>
                    {s.enabled ? "Active" : "Inactive"}
                    {s.authorized_at && <><br /><span className="adm-muted">autorisée le {fmt(s.authorized_at)}{s.authorized_by ? ` par ${s.authorized_by}` : ""}</span></>}
                  </td>
                  <td>{fmt(s.last_fetched_at)}<br /><span className={s.last_status?.startsWith("error") ? "adm-error-text" : "adm-muted"}>{s.last_status ?? "—"}</span></td>
                  {isAdmin && (
                    <td>
                      <form action={toggleSourceAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="enable" value={s.enabled ? "0" : "1"} />
                        <button className="adm-btn" type="submit">{s.enabled ? "Désactiver" : "Activer"}</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin ? (
        <form action={addSourceAction} className="adm-form" aria-labelledby="h-add">
          <h2 id="h-add" className="adm-section-title">Ajouter une source</h2>
          <fieldset className="adm-fieldset">
            <legend>Flux RSS ou Atom</legend>
            <div className="adm-field">
              <label htmlFor="name">Nom de la publication</label>
              <input id="name" name="name" className="adm-input" required minLength={2} maxLength={200} />
            </div>
            <div className="adm-field">
              <label htmlFor="homepage_url">Site (facultatif)</label>
              <input id="homepage_url" name="homepage_url" type="url" className="adm-input" placeholder="https://…" maxLength={500} />
            </div>
            <div className="adm-field adm-full">
              <label htmlFor="feed_url">Adresse du flux (HTTPS)</label>
              <input id="feed_url" name="feed_url" type="url" className="adm-input" required placeholder="https://…" maxLength={500} />
              <small>Copiez l&apos;adresse du flux depuis le site de la publication. Elle est lue et contrôlée avant l&apos;enregistrement ; un flux illisible ou vide est refusé.</small>
            </div>
            <div className="adm-field">
              <label htmlFor="kind">Format</label>
              <select id="kind" name="kind" defaultValue="rss"><option value="rss">RSS</option><option value="atom">Atom</option></select>
            </div>
            <div className="adm-field">
              <label htmlFor="language">Langue</label>
              <select id="language" name="language" defaultValue="en">
                <option value="fr">Français</option><option value="en">Anglais</option><option value="es">Espagnol</option><option value="pt">Portugais</option><option value="other">Autre</option>
              </select>
            </div>
            <div className="adm-field adm-full" role="group" aria-labelledby="l-regions">
              <span id="l-regions">Priorités éditoriales couvertes</span>
              <div className="adm-row" style={{ gap: "1.25rem", flexWrap: "wrap" }}>
                {REGIONS.map(([k, label]) => <label key={k}><input type="checkbox" name={`region_${k}`} /> {label}</label>)}
              </div>
            </div>
            <div className="adm-field adm-full">
              <label htmlFor="usage_terms">Conditions de réutilisation vérifiées</label>
              <textarea id="usage_terms" name="usage_terms" required minLength={20} maxLength={1000} rows={3} placeholder="Ex. : flux public proposé par l'éditeur ; reprise du titre, d'un court résumé et du lien vers l'article, avec mention de la source." />
              <small>La newsletter ne reprend que le titre, un court résumé rédigé et le lien vers l&apos;article d&apos;origine, toujours avec le nom de la source.</small>
            </div>
            <div className="adm-field adm-full">
              <label><input type="checkbox" name="terms_checked" required /> J&apos;ai vérifié que la publication autorise cet usage de son flux.</label>
            </div>
          </fieldset>
          <div className="adm-actions">
            <button className="adm-btn adm-btn-primary" type="submit" disabled={!isSupabaseAdminConfigured()}>Tester le flux et enregistrer</button>
          </div>
          <p className="adm-muted">Une source ajoutée reste inactive : activez-la ensuite dans le tableau pour qu&apos;elle alimente la collecte.</p>
        </form>
      ) : (
        <p className="adm-muted">L&apos;ajout et l&apos;activation des sources sont réservés aux administrateurs.</p>
      )}
    </>
  )
}
