# Plan de migration Supabase — projet « akori » → schéma BIB

> **Statut : préparé, NON exécuté.** Aucune opération n'a été faite sur le
> projet distant. Cette session ne disposait d'aucun accès Supabase : les
> constats ci-dessous sur l'état actuel proviennent de l'audit précédent
> fourni par le propriétaire et doivent être **revalidés** à l'étape 1.

## 0. Projet désigné

| Élément | Valeur |
|---|---|
| Nom | `akori` |
| Référence | `zwfyuhgnbdrjhetkyanj` |
| URL | `https://zwfyuhgnbdrjhetkyanj.supabase.co` |
| Région | `ca-central-1` |

État rapporté lors de l'audit (à revalider) : 30 tables `public` (RLS sur les
30, 57 politiques), 9 comptes Auth, buckets `profile-photos` et
`startup-data-room` (2 objets), aucune des 26 tables BIB, aucune migration BIB,
nombreuses alertes de l'analyseur Supabase liées à l'ancien schéma. Le
propriétaire indique que les anciennes fonctionnalités ne sont plus utilisées ;
**cela n'autorise aucune suppression** sans les étapes ci-dessous.

Ne jamais utiliser un projet d'un autre produit (notamment KoriVenture/platform,
Kori, kori-staging).

## 1. Revalidation et inventaire (lecture seule)

1. Vérifier l'identité : référence du projet dans le tableau de bord ET dans
   l'URL de connexion utilisée (`…zwfyuhgnbdrjhetkyanj…`).
2. Exécuter `supabase/ops/10_inventory_readonly.sql` (transaction `READ ONLY`,
   agrégats uniquement pour Auth) et archiver la sortie datée.
3. Lancer l'analyseur Supabase (sécurité, performance) et archiver le rapport.
4. Recenser les dépendances (section « clés étrangères » de l'inventaire,
   vues, fonctions, déclencheurs, politiques Storage).

## 2. Sauvegarde et restauration (prérequis bloquant)

| Élément | Méthode | Preuve attendue |
|---|---|---|
| Schéma + données | `pg_dump --format=custom` via la chaîne de connexion directe | Fichier `.dump` + somme SHA-256 |
| Rôles et politiques | inclus dans le dump (`--no-owner` à la restauration) | — |
| Storage | export des objets des 2 buckets (API Storage) | Liste des objets + tailles |
| Auth | export agrégé ; les comptes sont conservés dans le projet | — |
| Sauvegardes plateforme | vérifier le plan (sauvegardes quotidiennes / PITR) | Capture de la page Backups |

**Test de restauration obligatoire** : restaurer le dump sur un projet ou une
base jetable, comparer le nombre de tables et de lignes à l'inventaire. Sans
restauration réussie, ne pas continuer.

## 3. Opérations classées

| Opération | Nature | Réversible | Autorisation |
|---|---|---|---|
| Inventaire, analyseur | lecture | — | non requise |
| Préflight `00_preflight_bib.sql` | lecture | — | non requise |
| Migrations BIB 0001 → 0008 | **additive** (nouvelles tables, types, fonctions, buckets) | oui (section 6) | **requise** (diff SQL présenté) |
| Premier opérateur (`bootstrap/first_editor.sql`) | additive | oui | requise |
| Nettoyage de l'ancien schéma (`90_legacy_cleanup.TEMPLATE.sql`) | **destructive** | seulement par restauration | **accord écrit explicite**, séparé |
| Suppression des buckets hérités | **destructive** | par ré-import | accord écrit |
| Comptes Auth hérités | conservés | — | aucune suppression prévue |

## 4. Migration vers le schéma BIB (staging d'abord)

Stratégie recommandée : **projet de staging BIB distinct** pour la recette
(Preview Vercel), puis `akori` comme production après validation. Si un seul
projet est disponible, appliquer sur `akori` uniquement après les étapes 1-2.

```bash
# 1. Préflight (échoue si un nom BIB existe déjà)
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/00_preflight_bib.sql
# 2. Diff présenté au propriétaire
supabase link --project-ref zwfyuhgnbdrjhetkyanj
supabase db push --dry-run
# 3. Après accord explicite seulement
supabase db push
```

Les migrations sont **additives** : elles ne modifient ni ne suppriment les 30
tables héritées. Le préflight bloque si un objet porte le même nom qu'un objet
BIB (tables, types, fonctions, vues, buckets, schéma `private`), car
`create table if not exists` réutiliserait silencieusement une table étrangère.
En cas de conflit : renommer l'objet hérité (après accord) ou choisir un projet
vierge.

## 5. Contrôles après migration

```sql
-- 26 tables BIB, toutes avec RLS
select count(*) filter (where c.relrowsecurity), count(*)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname in ('editors','editorial_audit','rate_limit_hits','events','event_translations','media_assets',
  'stories','story_translations','story_media','testimonials','data_sources','dataset_versions','ingestion_runs',
  'metric_definitions','metric_observations','dataset_artifacts','news_sources','news_items','ai_runs',
  'newsletter_cycles','newsletter_editions','edition_checks','send_runs','ops_incidents','newsletter_consents','sob_insights');
-- Aucun opérateur avant le bootstrap
select count(*) from public.editors;            -- attendu : 0
-- Fonctions DEFINER : search_path fixé, non exécutables par anon
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute');  -- attendu : aucune ligne
-- Buckets BIB
select id, public from storage.buckets where id like 'bib-%' order by 1;
```

Puis : analyseur Supabase, comparaison avec le rapport de l'étape 1 (les
alertes héritées restent tant que le nettoyage n'est pas autorisé).

## 6. Retour arrière

- **Avant toute écriture applicative** : les objets BIB peuvent être retirés
  (tables BIB, types, fonctions, buckets `bib-*` vides) sans toucher à
  l'ancien schéma ; script à préparer à partir de la liste du préflight.
- **Après écriture** : restauration du dump de l'étape 2 (ou PITR).
- Côté site : promouvoir le déploiement Vercel précédent ; drapeaux `FEATURE_*`
  à `false` ; `FEATURE_SOB_READ_FROM_SUPABASE=false` (repli sur les JSON).

## 7. Environnements

| Environnement | Supabase | Vercel | Brevo | Tâches planifiées |
|---|---|---|---|---|
| Local | PostgreSQL jetable (`supabase/tests/run.sh`) ou `supabase start` | `pnpm dev` | aucune clé | aucune |
| Staging | projet BIB de staging (à créer, autorisation requise) | Preview | listes de test | manuel (`workflow_dispatch`) |
| Production | `akori` après migration autorisée | Production | listes réelles | `BIB_SCHEDULES_ENABLED=true` sur décision |

Les Preview ne doivent jamais pointer vers la production ; la production ne
doit jamais utiliser une base de test. Matrice des variables :
`docs/DEPLOYMENT.md`, section « Matrice des variables ».
