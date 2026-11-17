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
| Nettoyage de l'ancien schéma (migration 0010, `supabase/ops/akori/03_cleanup_koriventure.sql`) | **destructive** | seulement par restauration | **accord écrit explicite**, séparé |
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

## 8. État au 14 novembre 2026 et consolidation « 100 % BIB »

### 8.1 Inventaire vérifié (lecture seule, 14/11/2026)

| Élément | BIB | KoriVenture (historique) |
| --- | --- | --- |
| Tables `public` | 26 (RLS activée partout) | 30 (RLS activée), 191 lignes au total |
| Fonctions `public`/`private` | 6 (`private.is_admin/is_editor/set_updated_at`, `consume_rate_limit`, `current_editor_role`, `publish_dataset_version`) | 21 `kori_*` |
| Vues | `media_public`, `testimonials_public` | — |
| Types énumérés | 11 | — |
| Déclencheurs `public` | 8 | 8 (sur tables historiques) |
| Politiques RLS | 34 sur tables BIB + 4 Storage | 57 sur tables historiques + 8 Storage |
| Buckets | 4 (`bib-*`) ; `bib-sob-candidates` créé par 0007 | `profile-photos` (2 fichiers, 4,2 Mo), `startup-data-room` (vide) |
| Comptes Auth | 0 éditeur BIB | 9 comptes historiques (7 avec profil KoriVenture) |
| Extensions | plpgsql, pgcrypto, uuid-ossp, pg_stat_statements, supabase_vault, pg_graphql | — |

Aucune clé étrangère, vue ou fonction BIB ne dépend d'un objet KoriVenture.
Aucun déclencheur sur `auth.users` : un compte Auth n'obtient jamais de rôle
BIB automatiquement (`editors` vide ; seul le bootstrap explicite en crée un).

### 8.2 Historique des migrations

> **État actuel (vérifié le 16 novembre 2026)** : les treize migrations 0001 à
> 0013 sont enregistrées sur `akori` sous leurs versions GitHub
> (`20261112000100` à `20261117001300`), 0010 comprise ; les modes sont
> `sob = auto`, `sob_insights = auto`, `newsletter = review`. Le tableau et la
> procédure ci-dessous décrivent la situation du 14 novembre 2026 et sont
> conservés comme historique.

| Fichier GitHub | Version Supabase actuelle | État |
| --- | --- | --- |
| 0001 `core_admin` | 20261114000151 `bib_0001_core_admin` | appliquée (MCP) |
| 0002 `events` | 20261114000209 | appliquée (MCP) |
| 0003 `bib_en_action` | 20261114000242 | appliquée (MCP) |
| 0004 `state_of_bib` | 20261114000318 | appliquée (MCP) |
| 0005 `newsletter_ai` | 20261114000355 | appliquée (MCP) |
| 0006 `editorial_integrity` | — | à appliquer (`01_apply_0006_0011.sql`) |
| 0007 `sob_governance` | — | à appliquer (idem) |
| 0008 `newsletter_integrity` | — | à appliquer (idem) |
| 0009 `security_hardening` | — | à appliquer (idem) |
| 0010 `legacy_koriventure_cleanup` | — | après approbation (`03_cleanup_koriventure.sql`) |

L'application à distance par l'outil MCP est annulée automatiquement par le
client (trois tentatives, aucune exécution). Les scripts sont donc fournis pour
l'éditeur SQL du tableau de bord, dans `supabase/ops/akori/` (régénérés par
`build.py`) :

1. `01_apply_0006_0011.sql` — non destructif ; refuse de s'exécuter si 0006 est
   déjà présente (jamais de rejeu).
2. `02_reconcile_history.sql` — remplace les 5 versions MCP par les versions
   GitHub dans `supabase_migrations.schema_migrations` (métadonnées seulement).
3. `03_cleanup_koriventure.sql` — destructif, **uniquement après approbation
   écrite** de la liste 8.4.

### 8.3 Sauvegarde, preuve de restauration, répétition

- Export logique complet (catalogue + données des 56 tables + liste des
  objets Storage) réalisé le 14/11/2026 par requêtes en lecture seule ; conservé
  hors dépôt (données personnelles). Requêtes : `supabase/ops/export_catalog.sql`.
- `supabase/ops/build_replica.py` reconstruit une réplique fidèle sur un
  PostgreSQL jetable : **56 tables, 191 lignes, 0 écart** avec l'export.
- Répétition sur la réplique : 01 → 02 → 03, puis toutes les suites de tests
  SQL : **réussite** (26 tables, 0 fonction `kori_*`, données BIB et objets
  Storage conservés ; 03 relancé = aucun effet).
- Retour arrière testé : `build_replica.py --legacy-rollback` produit un script
  qui recrée **uniquement** les objets supprimés par 0010 ; appliqué après le
  nettoyage, il restitue les 30 tables, leurs 191 lignes, les 21 fonctions et
  les politiques, à l'identique.
- Limite : le PostgreSQL local est en version 16 (Supabase : 17) ; aucune
  fonctionnalité propre à la 17 n'est utilisée par ces scripts.

### 8.4 Liste exacte soumise à approbation (nettoyage 0010)

- **30 tables** : agreement_acceptances, capital_releases, communities,
  community_memberships, deal_closing_checklist_items, deal_milestones, deals,
  diligence_discussion_messages, diligence_evidence, diligence_evidence_items,
  diligence_evidence_requests, diligence_recommendations,
  diligence_request_messages, diligence_reviews, diligence_risks,
  diligence_room_invites, diligence_room_members, diligence_rooms,
  diligence_workstreams, founder_profiles, investor_profiles, multisig_signers,
  onboarding_progress, profiles, spvs, startup_documents, startups,
  waiting_list_form, wallet_transactions, wallets — avec leurs 57 politiques,
  index, contraintes, 8 déclencheurs et la séquence `waiting_list_form_id_seq`.
- **21 fonctions** `public.kori_*`.
- **8 politiques Storage** : « founders delete/read/update/upload own data
  room », « profile photos are readable », « users delete/update/upload own
  profile photo ».
- **Hors SQL (tableau de bord, après export des 2 fichiers)** : buckets
  `profile-photos` et `startup-data-room` (Supabase interdit la suppression SQL
  des objets Storage).
- **Comptes Auth (9)** : aucune suppression proposée par défaut. Décision
  individuelle du propriétaire ; aucun n'a de rôle BIB.

### 8.5 Durcissement 0009 (alertes Supabase)

- `security_definer_view` : vues publiques en `security_invoker` ; le rôle
  `anon` lit les colonnes non sensibles des seules lignes publiables (RLS +
  droits par colonne). Testé : `supabase/tests/40_security_hardening.sql`.
- `pg_graphql_*_table_exposed` : `pg_graphql` retiré (non utilisé ; retour :
  `create extension pg_graphql`).
- `unindexed_foreign_keys` : 26 index sur les clés étrangères BIB.
- Conservé volontairement : `current_editor_role()` exécutable par
  `authenticated` (ne renvoie que le rôle de l'appelant) ; `newsletter_consents`
  et `rate_limit_hits` sans politique (accès service uniquement).
- À activer dans le tableau de bord : protection contre les mots de passe
  compromis (Auth > Providers > Email).

### 8.6 Autorisation du 14/11/2026 et procédure d'exécution

Le propriétaire a autorisé l'application de 0006–0009 et le retrait de **tout**
ce qui relève de KoriVenture, y compris les **9 comptes Auth**. L'exécution
par l'outil MCP reste annulée automatiquement par le client (6 tentatives,
aucune exécution). Procédure dans l'éditeur SQL du projet akori, dans l'ordre,
chaque script étant une transaction unique protégée contre le rejeu :

1. `supabase/ops/akori/01_apply_0006_0011.sql`
2. `supabase/ops/akori/02_reconcile_history.sql`
3. `supabase/ops/akori/03_cleanup_koriventure.sql`
4. `supabase/ops/akori/04_delete_legacy_auth_users.sql` (refuse de s'exécuter
   avant 3, ou si la liste des comptes a changé)
5. Storage (tableau de bord) : télécharger si besoin les 2 fichiers de
   `profile-photos` (photos de profil de comptes supprimés à l'étape 4), puis
   supprimer les buckets `profile-photos` et `startup-data-room`.

Répétition complète 1 → 4 sur la réplique locale : réussie (26 tables,
0 fonction `kori_*`, 0 compte hérité, données BIB intactes, rejeu sans effet).
Sauvegarde vérifiée juste avant (56 tables, 191 lignes, inchangées).


## V2 — architecture cible

La V2 (Luma source de vérité des événements, State of BIB publié automatiquement depuis Supabase, modes auto/review/paused, édition humaine de la newsletter, migrations 0011 à 0013) est décrite dans [`V2_ARCHITECTURE_CIBLE.md`](V2_ARCHITECTURE_CIBLE.md) et [`SOB_AUTOMATION.md`](SOB_AUTOMATION.md). En cas de divergence avec une section plus ancienne de ce document, ces deux guides font foi.
