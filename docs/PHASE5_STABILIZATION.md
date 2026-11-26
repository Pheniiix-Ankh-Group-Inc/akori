# Phase 5 — Stabilisation, sécurité, migrations et préparation production

Date : 2026-11-26 · Branche `feat/immersive-home-20261126` (PR #74 → develop) · Point de départ : 377c988.
Projet Supabase `akori` (`zwfyuhgnbdrjhetkyanj`) · Projet Vercel `anbachain`.

Aucune PR fusionnée, `main` non modifié, aucune release, aucune migration appliquée à distance,
aucun envoi réel, aucune valeur de secret lue ou affichée (seuls des noms de variables figurent ici).

## 1. Verdict

**GO WITH CONDITIONS** pour la fusion dans `develop`. Le passage en production attend la levée
des conditions C1 à C5 (§10).

## 2. Anomalies traitées

| # | Anomalie | Gravité | Correction | Commit |
|---|---|---|---|---|
| 1 | CI #184 rouge : 4 tests `sob-public-rules` (crédits déplacés dans la page serveur par 377c988) | Bloquant | Le scan couvre désormais **tous** les fichiers de traduction (aucun fournisseur ni licence côté client). Les crédits obligatoires sont vérifiés dans la source de la page légale : lien de l'œuvre, auteur, lien de licence, mention des modifications. | 0e89291 |
| 2 | Lien partagé de l'explorateur perdu au chargement : l'effet d'écriture de l'URL voyait les filtres par défaut avant leur lecture (`?country=`, `?from=`… effacés) | Majeur | Hydratation portée par un état : la première écriture suit la lecture. Test e2e « URL partageable » rétabli. | fb1b32d |
| 3 | La visite guidée continuait malgré une interaction manuelle | Majeur | Arrêt sur pointeur ou molette sur la carte, clavier, zoom, réinitialisation, listes, classement, effacement ; arrêt aussi sur changement de métrique, région, période ou écosystème, ou sur un pays hors visite. Minuteries nettoyées ; aucune avance automatique en mouvement réduit. 6 scénarios e2e. | fb1b32d |
| 4 | Frise des versions : `<a href="/state_of_bib…">` bruts (perte de la langue `/en`, `/es`) et « dernier = courant » | Majeur | `Link` de `@/i18n/navigation`, version courante lue dans `dataset_versions.is_current`, `aria-current="page"`. | d12885c |
| 5 | Version `20260419T130333` présentée comme une version publiée | Majeur | Une version n'est vérifiée que si `published_at`, `decided_at`, `pipeline_version` et `source_fingerprint` sont tous renseignés. Elle reste archivée (rien n'est supprimé) mais sort du sélecteur, de la frise, de la tendance et de `?version=`. | d12885c |
| 6 | `run_cron.py` : une relance sur un cycle newsletter déjà annulé échouait à chaque passage | Moyen | Un cycle déjà `cancelled` ou `sent` est un no-op terminal. Une annulation produite par l'exécution en cours, ainsi que `failed` et `partially_sent`, restent en échec (alerte). La pause du module est un no-op explicite. | d1d8db1 |
| 7 | `cron_runs` : la newsletter était toujours enregistrée `success` ; une veille sans source aussi | Moyen | Classification (`src/lib/ops/cron-outcome.ts`), détaillée au §5.4. | d1d8db1 |
| 8 | URL du projet Supabase codée en dur comme valeur de repli dans `refresh-data.yml` | Moyen | Repli supprimé ; le preflight échoue explicitement si `SUPABASE_URL` manque ou n'a pas la forme `https://<ref>.supabase.co`. **Prérequis : condition C3.** | 56a7171 |
| 9 | Test e2e « mouvement réduit » toujours vrai : `/scale/` acceptait `scale(1)` | Mineur | L'assertion exige un zoom réel. | fb1b32d |
| 10 | 3 clés étrangères sans index ; 5 tables avec plusieurs policies permissives | Perf (INFO/WARN) | Migration 0016 (§3). | 110e6a0 |
| 11 | Historique local sans `20261114001000` alors que la version est enregistrée à distance | Moyen | Marqueur d'historique sans instruction (§3.2). | 110e6a0 |

## 3. Migrations

### 3.1 État

| Version | Nom | Local | Distant (akori) | Action |
|---|---|---|---|---|
| 20261112000100 … 20261122205510 | 13 migrations | oui | appliquées | aucune |
| 20261114001000 | legacy_koriventure_cleanup | **marqueur ajouté** | enregistrée, 0 instruction | aucune (§3.2) |
| 20261125000100 | bib_cron_runs | oui, testée | **non appliquée** (`public.cron_runs` absente) | C1 |
| 20261126000100 | bib_fk_indexes_policy_consolidation | **nouvelle**, testée | non appliquée | C1 |

Tests locaux sur PostgreSQL 16 jetable (`supabase/tests/run.sh`) : les 16 migrations et tous
les tests SQL passent, concurrence de publication incluse. `cron_runs` n'a **pas** été dupliquée.

### 3.2 `legacy_koriventure_cleanup`

Constats sur akori :
- la version est enregistrée dans `supabase_migrations.schema_migrations` avec un tableau
  `statements` vide ;
- 0 fonction `public.kori_*` ;
- 29 tables `public`, toutes BIB.

Le nettoyage destructif a donc été appliqué hors `db push`, par
`supabase/ops/akori/03_cleanup_koriventure.sql`, qui enregistre lui-même la version.

Stratégie retenue : un fichier `supabase/migrations/20261114001000_legacy_koriventure_cleanup.sql`
qui ne contient que des commentaires et `select 1;`. L'historique local rejoint ainsi le distant.
Rien n'est réexécuté, rien n'est supprimé de l'historique distant, et le script destructif n'est
pas recopié.

### 3.3 Migration 0016

- **Index** :
  - `automation_settings(updated_by)` ;
  - `dataset_version_deltas(previous_version_id)` ;
  - `dataset_version_deltas(metric_key)`.
- **RLS** sur `events`, `event_translations`, `stories`, `story_media`, `story_translations` :
  - `*_public_read` réservé à `anon`, contenus publiés uniquement ;
  - `*_read` pour `authenticated` : éditeur ou contenu publié ;
  - écritures éditeur séparées en INSERT / UPDATE / DELETE, avec les mêmes prédicats `is_editor()`.
- **Droits inchangés**, vérifiés par `supabase/tests/96_policy_consolidation.sql` (invariants
  structurels et matrice anon / connecté / éditeur désactivé / éditeur actif) et par les tests RLS
  existants, qui s'exécutent après toutes les migrations.
- **Index inutilisés** : les 24 signalés sont conservés, faute de preuve. Ce sont surtout des
  index de clés étrangères sur des tables peu peuplées.

### 3.4 Application distante (après validation explicite)

Prérequis :
1. sauvegarde ou PITR vérifié ;
2. fenêtre sans publication State of BIB en cours ;
3. accord écrit.

```bash
# Depuis la branche validée, CLI Supabase liée à akori :
supabase link --project-ref zwfyuhgnbdrjhetkyanj
supabase migration list            # 20261114001000 doit apparaître des deux côtés
supabase db push --dry-run         # doit lister exactement 20261125000100 et 20261126000100
supabase db push
```

Contrôles après application :
- `get_advisors` sécurité et performance : les 3 avertissements de clés étrangères et les
  5 avertissements de policies multiples doivent disparaître ;
- `select to_regclass('public.cron_runs')` n'est pas nul ;
- `GET /api/cron/health` renvoie `source: "cron_runs"`.

Retour arrière :
- 0016 : `drop index` des 3 index, puis recréation des policies d'origine. Leur définition est
  dans 20261112000200 et 20261112000300 ;
- `cron_runs` : `drop table public.cron_runs`. Le code tolère son absence, avec un seul
  avertissement journalisé.

## 4. Sécurité

| Point | Constat | Statut |
|---|---|---|
| Advisor sécurité | `rls_enabled_no_policy` (INFO) sur `dataset_version_deltas`, `newsletter_consents`, `rate_limit_hits` : accès réservé au service, voulu. **Aucune policy publique ajoutée.** | Accepté |
| Advisor sécurité | Protection contre les mots de passe compromis désactivée (Auth) | **C4** : à activer dans le tableau de bord (Authentication → Passwords) |
| `pnpm audit` (prod et complet) | Aucune vulnérabilité hors exception | OK |
| Exception picomatch GHSA-fc5q-39xc-vjpf | Dépendances de développement uniquement (ESLint, Vitest). Aucune version corrigée publiée (4.0.7 est la dernière). La CI échoue au 2026-12-17 ou si picomatch entre dans le graphe de production. | **Non prolongée.** Décision à prendre avant le 17/12 (C5) |
| Exposition | e2e : HTML brut (données d'hydratation), flux RSC et tous les scripts `/_next/static` référencés ; aucun fournisseur, licence ou secret sur 7 routes publiques. Testé avec State of BIB disponible et indisponible. | OK |
| CRON | `POST` sans jeton → 401, `GET` → 404/405 (e2e) | OK |
| Protection Vercel | Non modifiée | OK |

### 4.1 Confidentialité des données — dépôt public (analyse, aucune modification)

Constats :
- dépôt `public`, 0 fork ;
- `data/state-of-bib/current` (6 fichiers, 48 Ko) et `history/20260419T130333` (56 Ko) sont
  versionnés depuis #32 ;
- ces fichiers sont importés côté serveur par `src/lib/sob/load.ts` comme repli de développement.
  Aucun n'est servi publiquement (e2e : `/data/*.json` → 404).

| Option | Effet | Impact |
|---|---|---|
| A. Passer le dépôt en privé | Supprime la lecture publique des jeux de données et du code | Vercel : aucun impact (intégration GitHub App). GitHub Actions : minutes facturées au-delà du quota. Liens publics vers le code cassés. Les forks et clones existants restent hors de contrôle. **Décision propriétaire.** |
| B. Sortir les données du dépôt : bucket privé `bib-sob-candidates`, repli de développement par fixture locale non versionnée | Le dépôt peut rester public | Modifie le repli de `load.ts` et la CI (`validate.py`, `ci.yml`). L'historique Git conserve les anciennes versions : un nettoyage exigerait une réécriture d'historique, **non autorisée**. |
| C. Statu quo | Agrégats dérivés d'un jeu CC BY 4.0, donc redistribution licite | Contraire à la règle interne « pas de téléchargement public » pour qui parcourt le dépôt |

Recommandation : A, puis B dans une phase dédiée. Aucune action sans validation.

## 5. Automatisations

### 5.1 Veille d'actualités
- **État** : `news_sources` est vide (0 source, 0 article) et `FEATURE_NEWS_INGEST` n'est pas
  défini sur Vercel. L'API répond donc `skipped`, et `run_cron.py` fait échouer le workflow
  (« disabled or skipped »), conformément au contrat.
- **États distingués** : désactivée (`skipped`), aucune source (`failed`/`no_sources`), toutes les
  sources en échec (`failed`/`all_failed`), échec partiel (`success`/`partial` + incident), rien de
  nouveau (`success`/`noop`), progression.
- **Sources proposées**, à valider une par une (flux RSS, conditions de réutilisation, langue).
  Aucune n'est insérée :
  - presse technologique africaine : TechCabal, Techpoint Africa, Disrupt Africa ;
  - presse crypto internationale, filtrée sur Afrique et Caraïbes : CoinDesk, The Block ;
  - sources institutionnelles : Banque centrale des Caraïbes orientales (DCash), Central Bank of
    the Bahamas (Sand Dollar), Bank of Jamaica (JAM-DEX), Central Bank of Nigeria (eNaira),
    Bank of Ghana (eCedi).

### 5.2 Analyses IA State of BIB
`FEATURE_AI` et `AI_*` sont absents de Vercel, et la base contient 0 analyse et 0 exécution IA.
Rien n'est généré et rien de fictif n'est affiché. La publication automatique ne touche que des
brouillons existants de la version courante. Activation : condition C2.

### 5.3 Newsletter
- 2 cycles, tous deux `cancelled`, avec des incidents `newsletter.blocked` (3) et
  `newsletter.cancelled` (2) sur 7 jours : les garde-fous fonctionnent.
- Aucun envoi pendant l'audit. Les règles de rattrapage et de créneau n'ont pas été modifiées.
- **Planification** : génération lundi 13:11 UTC, contrôle mardi 13:11 UTC. L'envoi du mercredi
  09:02 heure de New York a deux crons (13:02 UTC en heure d'été, 14:02 UTC en heure normale) ;
  `sendWindowState` ignore celui qui tombe hors créneau.
- **Idempotence** : verrou par statut (`setCycle` conditionnel) et cycle bloqué en `sending`
  marqué `failed` sans renvoi.
- **Relance** : voir anomalie 6.

### 5.4 `cron_runs` et contrôle de santé

`status` décrit la tâche technique ; `details.outcome` décrit le résultat métier :

| Résultat (`details.outcome`) | Signification | `status` |
|---|---|---|
| `progressed` | La tâche a fait avancer l'état | `success` |
| `noop` | Pause, créneau non atteint, verrou tenu ailleurs, cycle déjà clos | `skipped` |
| `business_stop` | Édition bloquée ou semaine annulée par les garde-fous | `success` |
| `delivery_failure` | Envoi interrompu ou partiel | `failed` |
| `partial` | Veille : une partie des sources en échec | `success` |
| `no_sources`, `all_failed` | Veille : aucune source, ou toutes en échec | `failed` |

`evaluateJob` compte une exécution `skipped` comme une présence (pas de « missing »), mais pas
comme un échec.

### 5.5 Luma
- Dernière synchronisation à 15:15 UTC, 3 exécutions réussies sur 24 h, alors que la
  planification est toutes les 10 minutes.
- C'est au-delà du seuil `maxGapMinutes` de 180 min. Planification GitHub irrégulière ou
  désactivée par intermittence : à vérifier dans l'onglet Actions (inaccessible depuis cette
  session).
- 1 événement publié.

### 5.6 Matrice des variables (noms uniquement)

| Variable | Code | `.env.example` | Vercel prod | Vercel preview/dev | GitHub |
|---|---|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | oui | oui | oui | oui | — |
| SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY | oui (l'un ou l'autre) | oui | SERVICE_ROLE | SECRET_KEY | secrets |
| SUPABASE_URL (workflows) | — | — | — | — | **à confirmer (C3)** |
| NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL | oui | SITE_URL (APP_URL ajouté) | les deux | APP_URL | BIB_SITE_URL |
| CRON_SECRET | oui | oui | oui | oui | BIB_CRON_SECRET |
| LUMA_ICAL_URL, NEXT_PUBLIC_LUMA_CALENDAR_ID | oui | oui | oui | ID seul | — |
| FEATURE_SOB_READ_FROM_SUPABASE | oui (actif par défaut) | oui | true | défaut | — |
| BREVO_API_KEY | oui | oui | oui | **absent** | — |
| BREVO_API_URL, SENDER_*, LIST_ID_*, DOI_TEMPLATE_ID_* | oui | oui | oui | oui | — |
| FEATURE_NEWS_INGEST, FEATURE_AI, AI_* | oui | oui | **absent** | absent | — |
| FEATURE_NEWSLETTER_SUBSCRIBE, FEATURE_NEWSLETTER_AUTOSEND, NEWSLETTER_EMAIL_HASH_PEPPER | oui | oui | **absent** | absent | — |
| FEATURE_OPS_ALERTS, OPS_ALERT_EMAIL_TO | oui | oui | absent | absent | — |
| GITHUB_DISPATCH_TOKEN / _REF / REPOSITORY_SLUG | oui | oui | absent | absent | — |
| BIB_SCHEDULES_ENABLED, SOB_* | — | — | — | — | variables (non lisibles ici) |

Aucune valeur n'a été créée ni inventée (identifiants Brevo, clés, secrets).

## 6. Frontend
- Frise des versions, `is_current`, visite guidée et lien partagé : §2.
- **Graphiques et animations** :
  - e2e State of BIB 34/34 : carte, comparaison, légende recalculée, filtres cumulés, zoom,
    clavier, brush, tri, écosystème, cohortes, URL partageable, visite, mouvement réduit, mobile
    tactile et cibles ≥ 44 px ;
  - aucune erreur JavaScript. Les scripts de débogage Vercel, chargés seulement en
    développement, sont ignorés.
- **Photos** : toujours non obtenues. Les sites de banques d'images, Wikimedia et l'export Canva
  sont bloqués depuis cet environnement. L'inventaire (`docs/IMAGES.md` §8) reste la liste
  d'attente. Aucune image IA n'est présentée comme une photo BIB.

## 7. Tests

| Suite | Résultat |
|---|---|
| `pnpm lint` | 0 erreur, 0 avertissement (hors stub de polices local, non commité) |
| `pnpm typecheck` | OK |
| `pnpm test` (Vitest) | **369/369** |
| `pnpm build` | OK |
| `pnpm test:e2e` (State of BIB, dev, données embarquées) | **34/34** |
| `pnpm test:e2e:rules` (build de production) | **80/80** avec State of BIB indisponible (local sans Supabase), 80/80 avec données (dev) |
| Python `data-pipeline/tests` | **88 OK**, 9 ignorés (tests réseau ou Supabase) |
| SQL `supabase/tests/run.sh` (PostgreSQL 16 jetable) | OK, 16 migrations, tests 10 à 96 et concurrence |

Limites : la preview Vercel est protégée et n'a pas été testée en navigateur. La CI distante sera
rejouée au push.

## 8. Performance (laboratoire uniquement)

Build de production local, Chromium. Mobile : Pixel 7 avec processeur ralenti ×4.

| Page | LCP desktop | LCP mobile | CLS |
|---|---|---|---|
| /fr | 692 ms | 472 ms | 0 |
| /fr/state_of_bib (état indisponible) | 228 ms | 308 ms | 0 |
| /fr/about | 188 ms | 524 ms | 0 |
| /fr/evenements | 188 ms | 236 ms | 0 |
| /fr/data-sources | 152 ms | 276 ms | 0 |

**Données terrain** (Speed Insights, CrUX) : non consultées dans cette phase. Ces chiffres de
laboratoire, en local sans latence réseau, ne les remplacent pas.

## 9. Restauration (runbook)

1. **Application** :
   - Vercel → Deployments → déploiement précédent → *Instant Rollback* ;
   - ne jamais pousser sur `main` pour revenir en arrière.
2. **State of BIB** :
   - restaurer une version vérifiée avec `public.restore_dataset_version(uuid)`, réservé aux
     éditeurs, depuis l'administration. Le pointeur `is_current` change atomiquement ;
   - désactivation d'urgence : `FEATURE_SOB_READ_FROM_SUPABASE=false`.
3. **Base** :
   - PITR ou sauvegarde Supabase vers un nouveau projet de restauration, vérification, puis
     bascule des variables ;
   - jamais d'écrasement direct d'akori sans accord.
4. **Migrations 0015 et 0016** : retour arrière décrit au §3.4.
5. **Tâches planifiées** : `BIB_SCHEDULES_ENABLED` différent de `true` arrête tous les workflows
   (échec explicite, jamais silencieux).

## 10. Conditions avant production

| # | Condition | Responsable |
|---|---|---|
| C1 | Autoriser explicitement l'application distante de `20261125000100` et `20261126000100` (§3.4) | Propriétaire |
| C2 | Décider l'activation de la veille et de l'IA : sources validées (§5.1), `FEATURE_NEWS_INGEST`, `FEATURE_AI`, `AI_*` | Propriétaire / éditorial |
| C3 | Confirmer la présence de la variable ou du secret `SUPABASE_URL` dans l'environnement GitHub `production`, sinon `refresh-data` échoue au preflight | Propriétaire |
| C4 | Activer la protection contre les mots de passe compromis (Supabase Auth) | Propriétaire |
| C5 | Statuer sur l'exception picomatch avant le 2026-12-17 : correctif amont, retrait de la dépendance, ou nouvelle revue de risque | Sécurité |
| — | Décider de la visibilité du dépôt (§4.1) | Propriétaire |
| — | Vérifier la régularité du workflow Luma (§5.5) | Ops |
