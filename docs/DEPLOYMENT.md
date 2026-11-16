# Déploiement et activation — Black in Blockchain

Toutes les étapes ci-dessous sont **manuelles et volontaires**. Ce dépôt ne
crée aucun projet cloud, n'applique aucune migration distante, n'active aucune
tâche planifiée et n'envoie aucun e-mail par lui-même. Procéder sur **staging**
avant la production.

## 1. Projets Supabase BIB (staging puis production)

1. Créer deux projets Supabase **dédiés à BIB** (par ex. `bib-staging`,
   `bib-production`) dans une organisation BIB. Ne jamais utiliser un projet
   d'un autre produit.
2. Version PostgreSQL ≥ 15 (les migrations utilisent `unique nulls not distinct`).
3. Auth > Sign In / Providers : **désactiver « Allow new users to sign up »**.
   Activer l'e-mail (mot de passe et lien magique). Durée de vie courte des
   liens. URL de redirection autorisée : `https://<domaine>/auth/callback`.
4. Récupérer : URL du projet, clé publiable (`sb_publishable_…`), clé secrète
   (`sb_secret_…`).

## 2. Migrations

```bash
# Supabase CLI, depuis la racine du dépôt — APRÈS autorisation explicite
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/ops/00_preflight_bib.sql   # conflits de noms → arrêt
supabase link --project-ref <ref-staging>
supabase db push --dry-run  # diff à présenter avant toute application
supabase db push            # applique supabase/migrations/*.sql (0001 → 0013 ; 0010 est un script d'exploitation à part)
```

Projet existant contenant un ancien schéma (cas d'`akori`) : suivre
`docs/SUPABASE_MIGRATION_PLAN.md` (inventaire, sauvegarde testée, préflight).
Sur `akori`, les migrations 0001 à 0013 sont enregistrées (vérifié le
16 novembre 2026) : ne rien rejouer.
Validation locale sans aucun projet distant : `PGURL=… bash supabase/tests/run.sh`.

Vérifier ensuite dans le tableau de bord : tables, RLS activée partout,
buckets `bib-media-drafts`, `bib-media-public`, `bib-consents`,
`bib-sob-snapshots` et `bib-sob-candidates` (tous deux privés depuis 0012). Les avertissements du linter Supabase sur les vues
`media_public` et `testimonials_public` sont attendus (vues filtrantes
volontaires).

## 3. Variables Vercel

Par environnement (Preview → staging, Production → production) :

| Variable | Type | Remarque |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public | URL canonique |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | |
| `SUPABASE_SECRET_KEY` | **Sensitive** | serveur uniquement |
| `BREVO_*`, `NEWSLETTER_*` | Sensitive pour les clés | |
| `AI_*` | Sensitive pour la clé | fournisseur à choisir |
| `CRON_SECRET` | Sensitive | ≥ 32 caractères aléatoires |
| `OPS_ALERT_EMAIL_TO` | | adresses internes |
| `FEATURE_*` | | laisser `false` jusqu'à l'étape d'activation |

Supprimer les anciennes variables devenues inutiles : `BETTER_AUTH_*`,
`GOOGLE_CLIENT_*`, `SUPABASE_DATABASE_URL`, `STRIPE_*`, `NEXT_PUBLIC_SANITY_*`,
`SANITY_API_TOKEN`, `BREVO_LIST_ID` (remplacée par `BREVO_LIST_ID_FR/EN`).

**Prévisualisations Vercel.** Chaque push de branche déclenche un build de
prévisualisation. Le build n'envoie aucun e-mail, n'appelle aucune IA et
n'applique aucune migration. Les prévisualisations doivent pointer vers
**staging**, jamais vers la production.

## 4. Sanity (retrait)

Le code Sanity a été retiré ; les schémas sont archivés dans
`docs/archive/sanity-schemas/`. Avant de supprimer le projet Sanity, exporter
ses données s'il en contient :

```bash
npx sanity@latest dataset export production sanity-export.tar.gz --project <projectId>
```

Conserver l'export hors dépôt. Aucune donnée cloud n'a été supprimée par ce
chantier.

## 5. Premier opérateur

Prérequis : inscriptions publiques désactivées (Auth > Sign In / Providers >
« Allow new users to sign up » = off) et identité du premier administrateur
approuvée par écrit par le propriétaire.

1. Auth > Users > **Invite user** (adresse approuvée).
2. SQL Editor : `supabase/bootstrap/first_editor.sql` après avoir remplacé la
   seule ligne `v_email`. Le script refuse une adresse non remplacée, un compte
   inexistant ou ambigu, et toute exécution si un administrateur actif existe
   déjà ; il journalise l'opération dans `editorial_audit`.
3. L'administrateur ouvre le lien d'invitation, puis se connecte sur `/login`
   (lien discret « Espace équipe » en pied de page) ; il est redirigé vers
   `/admin`.
4. Révocation : `update public.editors set active = false where user_id = …` ;
   l'effet est immédiat (chaque page et action revérifie l'habilitation).
5. Un compte Auth sans ligne active dans `editors` n'a accès à aucune page ni
   action d'administration ; sur `/login`, il ne peut que se déconnecter.

## 6. Newsletter (Brevo)

1. Créer deux listes : FR et EN → `BREVO_LIST_ID_FR`, `BREVO_LIST_ID_EN`.
2. Créer deux modèles de **double opt-in** (FR, EN) contenant le lien de
   confirmation Brevo → `BREVO_DOI_TEMPLATE_ID_FR/EN`.
3. `NEWSLETTER_EMAIL_HASH_PEPPER` défini (secret, 32 caractères minimum,
   `openssl rand -hex 32`) : sans lui, l'inscription reste fermée (503).
4. Expéditeur vérifié + domaine authentifié (SPF, DKIM, DMARC) →
   `BREVO_SENDER_EMAIL`.
5. Régénérer la clé API (l'ancienne clé a pu être exposée en partie dans les
   journaux par l'ancien code) → `BREVO_API_KEY`.
6. Activer l'inscription : `FEATURE_NEWSLETTER_SUBSCRIBE=true` (staging d'abord).

## 7. Veille et moteur IA

1. Choisir et autoriser des sources (voir `docs/EDITORIAL_WORKFLOWS.md`).
2. Moteur IA — tout est en place ; il suffit d'ajouter la clé :

   | Fournisseur | Variables minimales |
   |---|---|
   | Anthropic | `AI_PROVIDER=anthropic`, `AI_API_KEY` (modèle par défaut `claude-sonnet-5-5`, modifiable par `AI_MODEL`) |
   | OpenAI | `AI_PROVIDER=openai`, `AI_API_KEY`, `AI_MODEL` |
   | Mistral | `AI_PROVIDER=mistral`, `AI_API_KEY`, `AI_MODEL` |
   | Autre (compatible OpenAI) | `AI_PROVIDER=openai-compatible`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` (https) |
   | Simulation (staging, recette) | `AI_PROVIDER=mock`, aucune clé — refusé en production |

   Puis `FEATURE_AI=true`. Garde-fous de coût : `AI_MAX_CALLS_PER_RUN`,
   `AI_MAX_TOKENS_PER_RUN`, `AI_MAX_OUTPUT_TOKENS`, `AI_TIMEOUT_MS`.
3. Vérifier sans appel : `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/ops/ai-status`
   (fournisseur, modèle, présence de la clé, problèmes — jamais la clé).
   Tester la clé (un seul appel de quelques jetons) : même URL en `POST`.
4. Ce que l'IA produit : brouillons de newsletter FR/EN (lundi, régénération
   bornée le mardi) et analyses State of BIB. Rien n'est publié ni envoyé sans
   les contrôles hors IA. En mode `auto` (réglage actuel de `sob_insights`),
   une analyse qui passe ces contrôles est publiée sans validation humaine ;
   en mode `review`, elle attend un administrateur.
5. `FEATURE_NEWS_INGEST=true` pour la veille.

## 8. Planification (GitHub Actions)

Variables de dépôt (Settings > Secrets and variables > Actions) :

| Nom | Type | Usage |
| --- | --- | --- |
| `BIB_SCHEDULES_ENABLED` | variable | `true` active les quatre workflows planifiés (le déclenchement manuel reste possible sans elle) |
| `BIB_SITE_URL` | variable | URL du site appelé (staging puis production) |
| `BIB_CRON_SECRET` | secret | identique à `CRON_SECRET` côté Vercel |
| `SOB_SUPABASE_SYNC` | variable | `true` autorise le pipeline State of BIB à écrire ; sans elle, le workflow échoue explicitement |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | secrets | projet BIB (pipeline) |

Horaires : synchronisation Luma toutes les 3 heures (minute 17) ; State of BIB
toutes les heures (minute 7) ; veille 10:41 UTC ; newsletter lundi et
mardi 13:11 UTC, mercredi 13:02 et 14:02 UTC (l'application ne retient que
la fenêtre 09:00–09:59 heure de Toronto, été comme hiver).

**Risque connu.** Les tâches planifiées GitHub peuvent démarrer avec retard.
Un retard de plus d'une heure le mercredi entraîne l'annulation de l'édition
(règle « sans rattrapage »). Un planificateur plus ponctuel (par ex. Vercel
Cron appelant les mêmes routes avec `CRON_SECRET`) peut être substitué.

## 9. Activation de l'envoi automatique

Conditions préalables, toutes requises :

1. Au moins un cycle complet observé sur staging (`/admin/newsletter`) avec des
   éditions FR et EN au statut `eligible`.
2. Listes Brevo de production, domaine authentifié, modèles validés.
3. Alertes e-mail reçues lors d'un incident simulé sur staging
   (`FEATURE_OPS_ALERTS=true`, `OPS_ALERT_EMAIL_TO`).
4. Décision explicite de l'équipe.

Puis : `FEATURE_NEWSLETTER_AUTOSEND=true` en production.

## 10. State of BIB

Fonctionnement **entièrement automatique** (migration 0013) : détection →
construction → contrôles → publication → vérification, sans approbation.

1. GitHub : variable `SOB_SUPABASE_SYNC=true` + secrets `SUPABASE_URL`,
   `SUPABASE_SECRET_KEY` (projet BIB uniquement). Pour la PR automatique de
   copie technique : réglage « Allow GitHub Actions to create and approve pull
   requests ».
2. Migration 0013 (modes `auto`) : déjà enregistrée sur `akori`. Lancer « State of BIB —
   pipeline automatique » (`force_build` pour la première fois) : le lot est
   construit, validé, publié et vérifié **sans aucune approbation**, puis le
   site est actualisé. Guide complet : `SOB_AUTOMATION.md`.
3. Aucune action dans `/admin/state-of-bib` n'est nécessaire ; la page sert à
   surveiller. Aucune fusion de PR n'est requise pour publier.
4. Retour arrière : « Restaurer cette version » dans `/admin/state-of-bib`, ou
   `python publish_supabase.py rollback --version <version>`.
5. Le job `repo-sync` réconcilie PostgreSQL, Storage et le dépôt ; si le dépôt
   est en retard, une PR `data/state-of-bib-sync` propose la copie technique.
6. Côté site : lecture Supabase active par défaut
   (`FEATURE_SOB_READ_FROM_SUPABASE=false` pour forcer le repli). Sans version
   valide, le site affiche un état d'indisponibilité.

## 11. DNS et domaines

Le domaine actuel (`anbachain.org`, `www.anbachain.org`) est servi par Vercel.
Tout changement de domaine ou de marque doit être accompagné de redirections
301 et d'une mise à jour de `NEXT_PUBLIC_SITE_URL` et des URL autorisées
Supabase Auth.

## 12. Sauvegarde et retour arrière

- **Code** : retour arrière par « Promote » d'un déploiement précédent sur
  Vercel. La branche `main` précédente reste disponible.
- **Base** : sauvegardes Supabase (Point-in-Time Recovery selon l'offre) ;
  exporter le schéma avant toute nouvelle migration.
- **Désactivation d'urgence** : passer le drapeau concerné à `false`
  (`FEATURE_NEWSLETTER_AUTOSEND`, `FEATURE_AI`, `FEATURE_NEWS_INGEST`,
  `FEATURE_NEWSLETTER_SUBSCRIBE`) ou `BIB_SCHEDULES_ENABLED=false`.
- **Médias** : révoquer les droits d'un média dans `/admin/medias` le retire
  immédiatement du bucket public.
- Les e-mails déjà délivrés par Brevo ne peuvent pas être rappelés.

## 13. Matrice des variables

Valeurs réelles : jamais dans le dépôt ni dans un rapport. « Repli » = valeur
appliquée si la variable est absente.

| Variable | Rôle | Environnements | Sensible | Obligatoire | Repli sûr | Fonctionnalité |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL canonique | tous | non | oui (prod) | `http://localhost:3000` | liens, redirections Auth, CSRF |
| `NEXT_PUBLIC_SUPABASE_URL` | Projet Supabase (CSP dérivée au build) | tous | non | pour l'admin et les données | aucun accès Supabase | admin, événements, médias |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publique | tous | non | idem | idem | idem |
| `SUPABASE_SECRET_KEY` | Clé serveur | staging, prod | **oui** | pour newsletter, veille, médias publics | fonctions serveur désactivées | publication médias, limiteur, newsletter |
| `CRON_SECRET` | Authentifie les tâches | staging, prod | **oui** | pour les tâches | tâches refusées (401) | cron, rapport médias |
| `NEWSLETTER_EMAIL_HASH_PEPPER` | Empreintes e-mail/IP | staging, prod | **oui** | pour l'inscription (≥ 32 car.) | inscription fermée (503) | newsletter |
| `NEWSLETTER_CONSENT_VERSION` | Version du texte de consentement | tous | non | oui | `2026-11-v1` | preuve de consentement |
| `NEWSLETTER_MAX_REGENERATIONS` | Régénérations du mardi | tous | non | non | 2 | cycle |
| `BREVO_API_KEY` | API Brevo | staging, prod | **oui** | pour la newsletter | inscription/envoi fermés | newsletter, alertes |
| `BREVO_API_URL` | Point d'accès Brevo | tous | non | non | API officielle | idem |
| `BREVO_LIST_ID_FR/EN`, `BREVO_DOI_TEMPLATE_ID_FR/EN` | Listes et modèles | staging, prod | non | pour la newsletter | inscription fermée | idem |
| `BREVO_SENDER_EMAIL/NAME` | Expéditeur | staging, prod | non | pour l'envoi | envoi impossible | envoi |
| `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL` | Fournisseur IA | staging, prod | non | si `FEATURE_AI` | IA désactivée | génération |
| `AI_API_KEY` | Clé IA | staging, prod | **oui** | si `FEATURE_AI` | IA désactivée | génération |
| `AI_MAX_CALLS_PER_RUN`, `AI_MAX_TOKENS_PER_RUN`, `AI_MAX_OUTPUT_TOKENS`, `AI_TIMEOUT_MS` | Garde-fous coût | tous | non | non | 4 / 60 000 / 4 000 / 60 000 ms | génération |
| `OPS_ALERT_EMAIL_TO` | Destinataires d'alerte | staging, prod | données perso. | si alertes | pas d'alerte | incidents |
| `FEATURE_NEWSLETTER_SUBSCRIBE` | Inscription | tous | non | non | `false` | formulaire |
| `FEATURE_NEWSLETTER_AUTOSEND` | Envoi réel | prod (sur décision) | non | non | `false` | envoi |
| `FEATURE_AI`, `FEATURE_NEWS_INGEST`, `FEATURE_OPS_ALERTS` | Activations | tous | non | non | `false` | IA, veille, alertes |
| `FEATURE_SOB_READ_FROM_SUPABASE` | Lecture State of BIB en base | tous | non | non | `true` (`false` : copie du dépôt si valide, sinon indisponibilité) | State of BIB |
| `FEATURE_LUMA_SYNC`, `LUMA_ICAL_URL`, `NEXT_PUBLIC_LUMA_CALENDAR_ID` | Synchronisation et calendrier Luma | tous | non | non | synchronisation désactivée | événements |
| `HOME_SHOW_UNVERIFIED_SECTIONS` | Contenus non sourcés | tous | non | non | masqués | accueil |
| GitHub `BIB_SCHEDULES_ENABLED` | Tâches planifiées | dépôt | non | non | désactivées | cron |
| GitHub `SOB_SUPABASE_SYNC` | Écritures State of BIB | dépôt | non | pour le pipeline | échec explicite du workflow | pipeline |
| GitHub `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Pipeline | dépôt (secrets) | **oui** | si sync | aucune écriture | pipeline |
| GitHub `BIB_SITE_URL` (variable), `BIB_CRON_SECRET` (secret) | Déclencheurs | dépôt | `BIB_CRON_SECRET` oui | si planification | aucun appel | cron |

Contrôle d'identité avant migration : la référence dans `NEXT_PUBLIC_SUPABASE_URL`
(`zwfyuhgnbdrjhetkyanj` pour `akori`) doit être celle du projet visé.


## V2 — architecture cible

La V2 (Luma source de vérité des événements, State of BIB publié automatiquement depuis Supabase, modes auto/review/paused, édition humaine de la newsletter, migrations 0011 à 0013) est décrite dans [`V2_ARCHITECTURE_CIBLE.md`](V2_ARCHITECTURE_CIBLE.md) et [`SOB_AUTOMATION.md`](SOB_AUTOMATION.md). En cas de divergence avec une section plus ancienne de ce document, ces deux guides font foi.
