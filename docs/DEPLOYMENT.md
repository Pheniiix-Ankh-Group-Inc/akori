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
# Supabase CLI, depuis la racine du dépôt
supabase link --project-ref <ref-staging>
supabase db push            # applique supabase/migrations/*.sql
```

Vérifier ensuite dans le tableau de bord : tables, RLS activée partout,
buckets `bib-media-drafts`, `bib-media-public`, `bib-consents`,
`bib-sob-snapshots`. Les avertissements du linter Supabase sur les vues
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

1. Auth > Users > **Invite user** (adresse de l'opérateur).
2. SQL Editor : exécuter `supabase/bootstrap/first_editor.sql` après y avoir
   remplacé l'adresse.
3. L'opérateur ouvre le lien d'invitation, puis se connecte sur `/login`.
4. Opérateurs suivants : même procédure avec `role = 'editor'`.

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
2. Choisir un fournisseur IA, fixer budget et plafonds (`AI_MAX_CALLS_PER_RUN`,
   `AI_MAX_OUTPUT_TOKENS`), puis `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`
   (`AI_BASE_URL` pour un fournisseur compatible OpenAI).
3. `FEATURE_NEWS_INGEST=true`, `FEATURE_AI=true`.

## 8. Planification (GitHub Actions)

Variables de dépôt (Settings > Secrets and variables > Actions) :

| Nom | Type | Usage |
| --- | --- | --- |
| `BIB_SCHEDULES_ENABLED` | variable | `true` active les trois workflows planifiés |
| `BIB_SITE_URL` | variable | URL du site appelé (staging puis production) |
| `BIB_CRON_SECRET` | secret | identique à `CRON_SECRET` côté Vercel |
| `SOB_SUPABASE_SYNC` | variable | `true` active l'historisation State of BIB |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | secrets | projet BIB (pipeline) |

Horaires : veille 10:41 UTC ; State of BIB 07:17 UTC ; newsletter lundi et
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

## 10. State of BIB historisé

1. `SOB_SUPABASE_SYNC=true` + secrets Supabase dans GitHub.
2. Lancer manuellement « State of BIB — contrôle quotidien et historisation »
   avec `force_build` pour enregistrer la version courante.
3. Vérifier `dataset_versions` (une version `published`, `is_current = true`).
   Les JSON embarqués régénérés ne sont jamais poussés sur `main` : le
   workflow ouvre une pull request depuis `data/state-of-bib-<version>`, à
   relire et fusionner par une personne (le jeton du workflow doit pouvoir
   créer des PR : réglage « Allow GitHub Actions to create and approve pull
   requests » de l'organisation/du dépôt).
4. Côté site : `FEATURE_SOB_READ_FROM_SUPABASE=true`. En cas de problème, la
   page revient automatiquement aux JSON embarqués.

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
