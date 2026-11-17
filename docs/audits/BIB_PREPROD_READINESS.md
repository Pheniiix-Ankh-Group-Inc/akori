# Black in Blockchain — Rapport préproduction

Branche corrective `fix/bib-preproduction-readiness`, cible `develop`. État : correctifs de code soumis à CI ; aucun déploiement ou test réel n'est attesté.

## Constats et corrections

| Priorité | Cause racine | Correction | Test |
|---|---|---|---|
| P0 State of BIB | `revalidateTag("max")` suivi de `unstable_cache` peut relire l'ancienne version | RPC directe `verify_current_dataset`, lecture non cachée des six artefacts privés et contrôle SHA-256 ; aucune affirmation de visibilité publique | Vitest, puis requête HTTP/E2E staging |
| P0 Luma | Faux `ok: true` si `FEATURE_LUMA_SYNC` était désactivé | Suppression du drapeau, réponse 409 si traitement ignoré, rejet du flux vide et du verrou non atomique | Vitest + synchronisation staging |
| P0 GitHub Actions | Planifications `develop` inactives tant que le workflow n'existe pas dans `main` | Cron dix minutes préparé, dispatch manuel staging seulement | Contrôle du déclenchement après validation |
| P0 staging | Projet Supabase BIB staging distinct non confirmé | Plan d'isolement des secrets et données | Vérification manuelle avant tout test réel |

Fichiers modifiés : `src/lib/sob/load.ts`, `src/lib/sob/refresh.ts`, routes cron SOB et Luma, `src/lib/events/luma-sync.ts`, `src/lib/env.ts`, `.github/workflows/events-sync.yml`, deux tests unitaires, `.env.example`, README, CHANGELOG et guides. **Aucune migration existante modifiée.**

## Variables GitHub nécessaires (noms uniquement)

| Nom | Type | Portée | Si absent |
|---|---|---|---|
| `BIB_SCHEDULES_ENABLED` | Variable | Production, `true` uniquement après recette | Crons désactivés |
| `BIB_SITE_URL` | Variable | Site HTTPS production | Preflight en échec |
| `BIB_CRON_SECRET` | Secret | Valeur correspondant au Vercel `CRON_SECRET` production | Preflight en échec |
| `BIB_STAGING_SITE_URL` | Variable | Site HTTPS Preview/staging pour Luma manuel | Manuel en échec |
| `BIB_STAGING_CRON_SECRET` | Secret | Valeur correspondant au `CRON_SECRET` de Vercel Preview | Manuel en échec |
| `SOB_SUPABASE_SYNC` | Variable | Pipeline SOB, `true` uniquement sur cible autorisée | Pipeline en échec |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Secrets | Cible serveur du pipeline SOB | Pipeline en échec |

Les valeurs réelles et la présence de ces variables n'ont pas été vérifiées ; ne jamais les publier. Variables de cadence et de seuil : `docs/SOB_AUTOMATION.md`.

## Variables Vercel — isolation obligatoire

Staging : `NEXT_PUBLIC_SITE_URL` = URL HTTPS Preview, `NEXT_PUBLIC_SUPABASE_URL` = projet Supabase BIB staging, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = clé publique staging, `SUPABASE_SECRET_KEY` = clé secrète **staging**, `CRON_SECRET` = secret staging de 32 caractères minimum, `NEXT_PUBLIC_LUMA_CALENDAR_ID` et `LUMA_ICAL_URL` = identifiants et URL validés dans Luma. Production : mêmes noms, **valeurs différentes**, secrets indépendants, Supabase différent.

Conserver `FEATURE_AI=false`, `FEATURE_NEWSLETTER_AUTOSEND=false`, `FEATURE_NEWSLETTER_SUBSCRIBE=false` en recette initiale. Tester Brevo seulement avec listes et adresses dédiées : `BREVO_API_KEY`, `BREVO_LIST_ID_FR/EN`, `BREVO_DOI_TEMPLATE_ID_FR/EN`, `BREVO_SENDER_EMAIL`, `NEWSLETTER_EMAIL_HASH_PEPPER` (au moins 32 caractères). Newsletter en `review` : ne pas passer en `auto` sans autorisation.

## Tests et recette restant à faire

- CI PR : `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod --audit-level=high`, Python unitaires, tests SQL/RLS jetables ; Playwright E2E à exécuter avec environnement approprié.
- Vérifier six RPC `SECURITY DEFINER`, les permissions `anon/authenticated/editor/admin/service`, Storage et première connexion administrateur ; aucune migration distante dans cette mission.
- Vérifier physiquement que Preview Vercel cible **uniquement** Supabase staging ; configurer Preview, authentification et administrateur de test avec accord sur les éventuels coûts.
- Luma : confirmer la vraie URL du flux, première synchronisation, réexécution, annulations, récurrences, cas de flux partiel et absence d'historique. Luma ne garantit pas d'exposer tous les anciens événements.
- SOB : source réelle, manifeste, validation, publication, checksums, cache périmé, disponibilité publique via HTTP/E2E, échecs IA, reprise et rollback ; l'invalidation de cache ne constitue pas une preuve de disponibilité publique.
- Newsletter : Brevo à adresses de test uniquement, DOI, consentements, fuseaux et aucun envoi réel ; tester la prévention des doubles envois.
- Audit média (droits, téléchargement, cache CDN), journaux et quotas (GitHub cron dix minutes, Luma, Supabase, IA).
- Préparer remplacement de l'ancien pipeline `main` afin d'empêcher les traitements concurrents, sans lancer ce remplacement.

## Verdict / rollback

**Code prêt pour contrôles CI ; staging non vérifié ; production NON prête.** Pas de donnée Supabase distante modifiée, pas de publication ni d'envoi Brevo et pas de déploiement durant cette correction.

Rollback applicatif : revenir au déploiement précédent compatible avec le schéma ; aucune suppression/relecture d'anciennes migrations. Rollback SOB : voir procédure de restauration dans `docs/SOB_AUTOMATION.md`. Les risques résiduels ci-dessus bloquent la validation de production.
