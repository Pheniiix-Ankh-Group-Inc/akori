# State of BIB — fonctionnement entièrement automatique

Décision produit (MVP) : la collecte, la validation, la publication des données
et de leurs analyses se font **sans aucune approbation humaine**. L'administration
sert à surveiller et, exceptionnellement, à intervenir ; elle n'est pas une étape
du cycle. Aucun compte administrateur n'est nécessaire au fonctionnement.

## 1. Cycle automatique

| Étape | Qui | Détail |
|---|---|---|
| Détection | `refresh-data.yml`, job `check`, **au push sur main puis toutes les heures** | Lit le manifeste de la source ; compare la version et l'empreinte (chemin, taille, blake3) des fichiers utilisés. Rien n'est téléchargé si rien n'a changé. |
| Ingestion | job `build` (seulement si nécessaire) | URLs lues dans le manifeste, contrôle d'intégrité, calculs Python/DuckDB, **recalcul indépendant des totaux**, génération des six JSON. |
| Validation | `publish_supabase.py ingest` | Schéma, valeurs, dates, pays, villes, écosystèmes, doublons, totaux, cohérence entre fichiers, périmètre, provenance, comparaison avec la version courante. |
| Forte variation (> 50 %) | `reinforced.py`, automatique | Contrôles renforcés ; publication s'ils confirment la cohérence, sinon quarantaine. **Jamais d'approbation humaine.** |
| Publication | RPC `publish_dataset_candidate` (rôle de service) | Bascule atomique du pointeur courant, ancienne version marquée « remplacée », historique conservé, verrou contre les exécutions simultanées. |
| Vérification | `verify_publication` | Pointeur unique, identifiant de version, empreintes SHA-256 dans Storage, observations. Anomalie → retour automatique à la version précédente + incident critique. |
| Réconciliation | job `finalize` | PostgreSQL / Storage / copie du dépôt comparés à chaque exécution. |
| Site | `POST /api/cron/sob-refresh?version=…` | Caches invalidés et version PostgreSQL/Storage vérifiée **hors cache**. La visibilité publique doit être vérifiée par une requête HTTP/E2E distincte. Aucun redéploiement. Filet de sécurité : expiration du cache en 15 minutes. |
| Analyses IA | même appel | Analyse générée, contrôlée (faits, tendance, périmètre, règles éditoriales), publiée. Échec → rien n'est inventé, nouvelle tentative aux cycles suivants (3 par version et par langue). |
| Copie du dépôt | job `repo-sync` | PR automatique **sans fusion automatique**. Secondaire : le site ne l'attend jamais. |

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
| Version en base non confirmée | 3 tentatives, incident `sob.verification_failed`, expiration du cache en 15 minutes. |
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
activer « Allow GitHub Actions to create and approve pull requests » pour
créer une PR de sauvegarde technique. Aucune fusion automatique de cette PR
n'est demandée. La publication Supabase reste autonome et ne l'attend pas.

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
3. **GitHub** — renseigner les variables et secrets ci-dessus. Pour la collecte et la publication dans la base, les seuls paramètres requis dans le job `check` sont `SOB_SUPABASE_SYNC=true`, `SUPABASE_URL` et `SUPABASE_SECRET_KEY`. Si `BIB_SITE_URL` ou `BIB_CRON_SECRET` manque, la base peut être alimentée, mais la dernière étape de vérification/rafraîchissement du site échoue explicitement.
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

## 7. Schéma fournisseur réel validé (17 novembre 2026)

Le test réseau réel GitHub Actions [run #44194922073](https://github.com/Pheniiix-Ankh-Group-Inc/akori/actions/runs/44194922073) a identifié un changement de schéma **bloquant** pour la génération des statistiques :

- `developer_activities` et `eco_developer_activities` utilisent désormais `canonical_developer_id` et non `developer_id`.
- `canonical_developer_locations` expose `locality` plutôt que `city`.
- `canonical_developers` n'a plus de champ `first_commit_date` : la date réelle de première contribution est calculée par `MIN(day)` depuis `developer_activities`, sans inventer de données.
- Les noms alternatifs des anciens schémas sont toujours pris en charge pour préserver la compatibilité historique.
- Les colonnes normalisées sont exposées par des vues DuckDB et les calculs existants les utilisent. Des tests locaux valident les deux formats.

**Vérification complète des données réelles réussie.** GitHub Actions [run #44195969050](https://github.com/Pheniiix-Ankh-Group-Inc/akori/actions/runs/44195969050) a exécuté `build_data.py` directement sur les Parquet HTTPS, produit les six JSON et exécuté `validate.py` avec succès, sans secrets ni écriture dans Supabase. L'instantané `2026-11-09` contient 1 556 développeurs actifs (28 jours), 2 105 écosystèmes, 71 pays ayant de l'activité, 684 villes et 2 515 407 commits cumulés.

**Attention : cette réussite prouve la génération et la validation, pas la publication dans Supabase ni l'affichage sur le site.** Il faut encore exécuter le workflow authentifié sur `main`, confirmer les lignes `dataset_versions` et `ingestion_runs`, puis vérifier la route publique.

## 8. Limites connues

- Une vérification externe le 17 novembre 2026, depuis un runner GitHub sans secrets, a confirmé que le manifeste Electric Capital répond HTTP 200, version `20261117T130335`, 19 ressources dont les six attendues. Cela **ne prouve pas** qu'un build DuckDB et une publication authentifiée ont réussi. La première exécution de `refresh-data.yml` après release reste indispensable.
- L'intégrité des fichiers source est contrôlée par leur taille ; la
  vérification blake3 complète est optionnelle (`SOB_VERIFY_B3`).
- PostgreSQL, Storage et le dépôt ne forment pas une transaction unique : la
  bascule est atomique dans PostgreSQL, les écarts avec les autres supports
  sont détectés puis réconciliés.
