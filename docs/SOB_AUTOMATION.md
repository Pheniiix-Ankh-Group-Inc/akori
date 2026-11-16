# State of BIB — fonctionnement entièrement automatique

Décision produit (MVP) : la collecte, la validation, la publication des données
et de leurs analyses se font **sans aucune approbation humaine**. L'administration
sert à surveiller et, exceptionnellement, à intervenir ; elle n'est pas une étape
du cycle. Aucun compte administrateur n'est nécessaire au fonctionnement.

## 1. Cycle automatique

| Étape | Qui | Détail |
|---|---|---|
| Détection | `refresh-data.yml`, job `check`, **toutes les heures** | Lit le manifeste de la source ; compare la version et l'empreinte (chemin, taille, blake3) des fichiers utilisés. Rien n'est téléchargé si rien n'a changé. |
| Ingestion | job `build` (seulement si nécessaire) | URLs lues dans le manifeste, contrôle d'intégrité, calculs Python/DuckDB, **recalcul indépendant des totaux**, génération des six JSON. |
| Validation | `publish_supabase.py ingest` | Schéma, valeurs, dates, pays, villes, écosystèmes, doublons, totaux, cohérence entre fichiers, périmètre, provenance, comparaison avec la version courante. |
| Forte variation (> 50 %) | `reinforced.py`, automatique | Contrôles renforcés ; publication s'ils confirment la cohérence, sinon quarantaine. **Jamais d'approbation humaine.** |
| Publication | RPC `publish_dataset_candidate` (rôle de service) | Bascule atomique du pointeur courant, ancienne version marquée « remplacée », historique conservé, verrou contre les exécutions simultanées. |
| Vérification | `verify_publication` | Pointeur unique, identifiant de version, empreintes SHA-256 dans Storage, observations. Anomalie → retour automatique à la version précédente + incident critique. |
| Réconciliation | job `finalize` | PostgreSQL / Storage / copie du dépôt comparés à chaque exécution. |
| Site | `POST /api/cron/sob-refresh?version=…` | Caches invalidés, version servie **vérifiée** (échec du workflow sinon). Aucun redéploiement. Filet de sécurité : expiration du cache en 15 minutes. |
| Analyses IA | même appel | Analyse générée, contrôlée (faits, tendance, périmètre, règles éditoriales), publiée. Échec → rien n'est inventé, nouvelle tentative aux cycles suivants (3 par version et par langue). |
| Copie du dépôt | job `repo-sync` | PR automatique avec fusion automatique demandée. Secondaire : le site ne l'attend jamais. |

**Délai de mise à jour.** La source ne propose pas de notification : une nouvelle
version est détectée à la vérification horaire suivante, puis publiée après le
traitement (quelques minutes à quelques dizaines de minutes). L'actualisation
n'est donc pas instantanée. Si le fournisseur offre un jour un webhook, il suffit
d'appeler `workflow_dispatch` sur `refresh-data.yml` : le reste du cycle est inchangé.

## 2. Ce qui est détecté

- nouvelle version du fournisseur ;
- **correction sous le même numéro** (empreinte différente) → révision `<version>-r2`, `-r3`… ;
- changement du manifeste ou nouvelle ressource : journalisé (incident
  d'information `sob.source_new_resources`), sans retraitement si les fichiers
  utilisés sont inchangés ;
- version dont le traitement a échoué ou qui est en quarantaine : reprise automatique.

## 3. Contrôles renforcés (forte variation)

Une variation de plus de 50 % d'un indicateur total n'est pas, à elle seule, un
motif de blocage. La version est publiée si **tous** ces contrôles passent :

| Contrôle | Ce qui est vérifié |
|---|---|
| `recalcul_independant` | Les totaux recalculés par un second chemin (comptage direct, sans l'agrégat par pays) sont identiques aux totaux publiés. |
| `agregats` | Total = somme des pays = somme des régions ; villes ≤ total ; commits sur 12 mois ≤ cumul. |
| `perimetre` | Tous les pays et villes appartiennent au périmètre Afrique/Caraïbes. |
| `periodes` | Instantané non antérieur à la version courante ; séries mensuelles continues, alignées, arrêtées au mois de l'instantané. |
| `vraisemblance` | Aucun total multiplié ou divisé par plus de 10 ; le cumul des commits ne perd pas plus de la moitié. |
| `repartition_pays` | Pas de disparition de plus de la moitié des pays ; la variation n'est pas portée par un seul pays multiplié par plus de 5. |
| `historique` | Les mois déjà publiés ne sont pas réécrits (dérive médiane ≤ 20 %, moins d'un quart des mois fortement modifiés ; les 2 derniers mois sont exclus). |

Sinon la version est mise en **quarantaine** (`blocked`, motif enregistré,
incident `sob.quarantine`) ; la dernière version valide reste en ligne.

## 4. Échecs et reprises (bornées)

| Situation | Comportement automatique |
|---|---|
| Source inaccessible | 3 tentatives dans l'exécution, puis nouvelle vérification à l'heure suivante. Incident `sob.source_unreachable`. |
| Lot invalide | Version `blocked`, incident `sob.validation_blocked`, rien n'est stocké ni publié. |
| Quarantaine ou lot bloqué | Nouvelle tentative toutes les 24 h, 5 fois au plus ; immédiate si le pipeline est mis à jour ; une correction de la source crée une nouvelle révision, traitée normalement. |
| Échec technique du traitement | 3 reprises, puis attente d'un changement de la source ou du pipeline. |
| Publication non intègre | Retour automatique à la version précédente, incident critique `sob.desync`. |
| Site non actualisé | 3 tentatives, incident `sob.site_not_updated`, expiration du cache en 15 minutes. |
| Analyse IA en échec | Statistiques publiées quand même ; 3 tentatives par version et par langue. |

Un échec persistant sur une version n'empêche jamais la détection des versions suivantes.

## 5. Paramètres

**GitHub — variables du dépôt**

| Variable | Rôle | Valeur |
|---|---|---|
| `BIB_SCHEDULES_ENABLED` | Active les exécutions planifiées | `true` |
| `SOB_SUPABASE_SYNC` | Autorise l'écriture dans Supabase | `true` |
| `BIB_SITE_URL` | Adresse du site appelée après publication | URL de production |
| `SOB_CHECK_INTERVAL_HOURS` | Espace les lectures du manifeste (le cron reste horaire) | défaut `1` |
| `SOB_STRONG_VARIATION` | Seuil des contrôles renforcés | défaut `0.5` |
| `SOB_MAX_FAILED_ATTEMPTS` | Reprises après échec technique | défaut `3` |
| `SOB_MAX_BLOCKED_ATTEMPTS`, `SOB_BLOCKED_RETRY_HOURS` | Reprises d'une quarantaine | défauts `5` et `24` |
| `SOB_VERIFY_B3` | Vérification blake3 complète des fichiers source (téléchargement entier) | facultatif, `true` |

**GitHub — secrets** : `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (clé de service du
projet BIB), `BIB_CRON_SECRET` (même valeur que `CRON_SECRET` côté Vercel).

**GitHub — réglages du dépôt** (facultatifs, pour la copie technique) :
« Allow GitHub Actions to create and approve pull requests » et « Allow
auto-merge ». Si les protections de `main` exigent une approbation, la PR de
copie technique attend une fusion ; le site n'en dépend pas.

**Vercel**

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Lecture serveur de la version courante |
| `CRON_SECRET` | Authentifie l'appel d'actualisation |
| `FEATURE_SOB_READ_FROM_SUPABASE` | Absent ou `true` (lecture Supabase) |
| `FEATURE_AI`, `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY` | Analyses IA ; sans elles, les statistiques sont publiées et l'analyse est différée |
| `SOB_INSIGHTS_MAX_ATTEMPTS` | Tentatives d'analyse par version et par langue (défaut `3`) |
| `FEATURE_OPS_ALERTS`, `OPS_ALERT_EMAIL_TO` | Alerte e-mail en cas d'incident (facultatif) |

**Supabase** : `automation_settings` — `sob = auto`, `sob_insights = auto`
(réglés par la migration 0013). Les modes `review` et `paused` restent
disponibles pour une évolution future.

**Permissions** : le pipeline agit avec le rôle de service Supabase ; le site
est appelé avec le secret des tâches planifiées. Aucune session utilisateur.

## 6. Activation

1. **Supabase** — migration 0013 : **déjà enregistrée sur `akori`** (vérifié le
   16 novembre 2026, modes `sob` et `sob_insights` en `auto`). Sur un autre
   projet BIB : `supabase/ops/akori/06_apply_0013.sql` dans l'éditeur SQL (ou
   `supabase db push`). Vérifier :
   `select module, mode from public.automation_settings order by module;`
2. **Vercel** — déployer la branche ; vérifier `SUPABASE_SECRET_KEY` et `CRON_SECRET`.
3. **GitHub** — renseigner les variables et secrets ci-dessus.
4. **Première exécution** — Actions → « State of BIB — pipeline automatique » →
   Run workflow (`force_build` coché). La première version est publiée sans
   aucune approbation, y compris sur une base vide.
5. **Contrôle** — `/admin/state-of-bib` (version courante, journal), puis la page
   publique State of BIB.
6. **Planification** — `BIB_SCHEDULES_ENABLED = true`.

Une configuration incomplète fait **échouer** le workflow avec la liste de ce
qui manque : il n'y a jamais de faux succès.

Suspendre exceptionnellement : `/admin/automatisations` → mode « En pause », ou
`supabase/ops/akori/07_set_sob_auto.sql` pour revenir en automatique.

## 7. Limites connues

- Aucune exécution réelle n'a encore eu lieu : le manifeste et le schéma des
  fichiers de la source n'ont pas pu être lus depuis l'environnement de
  développement. Le pipeline vérifie les colonnes attendues et s'arrête avec un
  message explicite si le schéma diffère.
- L'intégrité des fichiers source est contrôlée par leur taille ; la
  vérification blake3 complète est optionnelle (`SOB_VERIFY_B3`).
- PostgreSQL, Storage et le dépôt ne forment pas une transaction unique : la
  bascule est atomique dans PostgreSQL, les écarts avec les autres supports
  sont détectés puis réconciliés.
