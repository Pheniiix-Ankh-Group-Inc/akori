// Règles publiques vérifiées sur le site démarré (HTTP uniquement, sans navigateur
// et SANS appel à Luma : seul le HTML servi par BIB est lu).
// Usage : BASE_URL=http://localhost:3000 SOB_EXPECT=available|unavailable node tests/e2e/public-rules.e2e.mjs
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const EXPECT = process.env.SOB_EXPECT || 'available'
const results = []
const ok = (name, cond, extra = '') => results.push([cond ? 'PASS' : 'FAIL', name, String(extra).slice(0, 160)])
const PROVIDER = /electric\s*capital|open\s*dev\s*data|opendevdata|developerreport|\bCC[\s-]?BY\b|creative\s*commons|natural\s*earth/i

const get = async (path) => {
  const res = await fetch(BASE + path, { redirect: 'follow' })
  return { status: res.status, html: await res.text() }
}
// Texte visible : sans scripts (données d'hydratation), styles ni balises.
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ')
// Tout le HTML sauf le dictionnaire de traductions embarqué (qui contient, par
// construction, le texte de la page légale pour la navigation côté client).
const hrefs = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((m) => m[1])

const run = async () => {
  for (const [label, path] of [['FR', '/fr/state_of_bib'], ['EN', '/state_of_bib']]) {
    const { status, html } = await get(path)
    const text = visible(html)
    ok(`State of BIB ${label} : page servie`, status === 200, status)
    ok(`State of BIB ${label} : aucun lien CSV/JSON ni export`, !hrefs(html).some((h) => /export|\.csv|\.json|format=/i.test(h)) && !/<a\b[^>]*\bdownload\b/i.test(html))
    ok(`State of BIB ${label} : aucun fournisseur ni licence affiché`, !PROVIDER.test(text), (text.match(PROVIDER) || [''])[0])
    ok(`State of BIB ${label} : lien vers la page légale`, hrefs(html).some((h) => /\/data-sources$/.test(h)))
    if (EXPECT === 'available') {
      ok(`State of BIB ${label} : indicateurs et visualisations présents`, /sob-hero-number|sob-big/.test(html) && /sob-cities/.test(html))
      ok(`State of BIB ${label} : date de référence affichée`, /sob-facts/.test(html))
    } else {
      ok(`State of BIB ${label} : état d'indisponibilité, aucun chiffre`, !/sob-hero-number|sob-big/.test(html) && /role="status"/.test(html))
    }
  }
  for (const [label, path] of [['FR', '/fr'], ['EN', '/']]) {
    const { status, html } = await get(path)
    const text = visible(html)
    ok(`Accueil ${label} : servi`, status === 200, status)
    ok(`Accueil ${label} : aucun fournisseur ni licence State of BIB`, !PROVIDER.test(text), (text.match(PROVIDER) || [''])[0])
    ok(`Accueil ${label} : lien légal dans le pied de page`, hrefs(html).some((h) => /\/data-sources$/.test(h)))
    if (EXPECT === 'unavailable') ok(`Accueil ${label} : aucun indicateur State of BIB affiché`, !/class="ed-stat"/.test(html.slice(html.indexOf('home-sob'))))
  }
  for (const [label, path, needle] of [['FR', '/fr/data-sources', 'Données, méthodologie et sources'], ['EN', '/data-sources', 'Data, methodology and sources']]) {
    const { status, html } = await get(path)
    const text = visible(html)
    ok(`Page légale ${label} : servie et titrée`, status === 200 && text.includes(needle), status)
    ok(`Page légale ${label} : fournisseur, jeu de données et licence`, /Electric Capital/.test(text) && /Open Dev Data/.test(text) && /CC BY 4\.0/.test(text))
    const links = hrefs(html)
    ok(`Page légale ${label} : liens officiels et texte de licence`, ['https://opendevdata.org', 'https://github.com/electric-capital/open-dev-data', 'https://creativecommons.org/licenses/by/4.0/', 'https://creativecommons.org/licenses/by/4.0/legalcode'].every((u) => links.includes(u)))
    ok(`Page légale ${label} : fond de carte référencé`, /Natural Earth/.test(text))
  }
  for (const path of ['/api/state-of-bib/export', '/api/state-of-bib/export?table=countries&format=csv', '/api/state-of-bib/export?table=cities&format=json', '/data/headline.json', '/data/country_map.json', '/data/meta.json', '/data-history/index.json']) {
    const res = await fetch(BASE + path, { redirect: 'manual' })
    ok(`ancienne ressource inaccessible : ${path}`, res.status === 404, res.status)
  }
  for (const path of ['/api/cron/sob-refresh', '/api/cron/sob-refresh?version=v1', '/api/cron/sob-insights']) {
    const res = await fetch(BASE + path, { method: 'POST' })
    ok(`tâche automatique ${path} : authentification exigée`, res.status === 401, res.status)
    const get = await fetch(BASE + path)
    ok(`tâche automatique ${path} : aucune lecture publique`, get.status === 405 || get.status === 404, get.status)
  }
  {
    const { status, html } = await get('/fr/evenements')
    const src = (html.match(/<iframe[^>]*\bsrc="([^"]+)"/i) || [])[1]
    ok('Événements : page servie', status === 200, status)
    ok('Événements : calendrier Luma embarqué conservé (URL de main, même calendrier)', src === 'https://lu.ma/embed/calendar/cal-aqEzCpUP5LXSBcL/events', src)
  }
  for (const path of ['/about', '/mission', '/membership', '/resources', '/press', '/contact']) {
    const { status, html } = await get(path)
    ok(`page en préparation ${path} : servie, non indexée`, status === 200 && /<meta[^>]+name="robots"[^>]+noindex/i.test(html), status)
  }
  for (const r of results) console.log(r.join(' | '))
  const passed = results.filter((r) => r[0] === 'PASS').length
  console.log(`${passed}/${results.length} réussis (State of BIB attendu : ${EXPECT})`)
  process.exitCode = passed === results.length ? 0 : 1
}
run().catch((e) => { console.error(e); process.exit(1) })
