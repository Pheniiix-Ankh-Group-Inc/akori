# Rapport d'implémentation — architecture cible BIB

- **Date** : 12–13 novembre 2026
- **Base** : `origin/main` = `b1c2a522bb7dc1bea63f97db8d2826ad98c902e2` (18 mai 2026)
- **Branche** : `feature/bib-architecture-cible-complete`
- **Validation de cette publication** : contrôles statiques GitHub Actions réussis sur la PR #32 (voir § 5), sans test ni activation de service externe.
- **Périmètre** : architecture cible complète (socle, site public, événements
  en base, BIB en action, administration, State of BIB historisé, veille, moteur
  IA, newsletter autonome FR/EN, documentation).
- **Hors périmètre, sur instruction** : refonte visuelle, refonte de la
  navigation, tests automatisés et recette fonctionnelle.

## 1. État initial (revalidé avant correction)

| Constat | Statut à la base | Traitement |
| --- | --- | --- |
| `POST /api/emails/welcome` envoyait un e-mail HTML à n'importe quelle adresse, prénom non échappé | Confirmé | Route supprimée |
| `console.log` du préfixe de `BREVO_API_KEY` à chaque inscription | Confirmé | Supprimé ; client Brevo réécrit, aucun secret journalisé |
| `/api/newsletter` sans consentement, sans anti-abus, e-mail de bienvenue direct | Confirmé | Réécrite (§ 3.7) |
| Next.js 16.1.6, better-auth 1.5.6 : failles critiques publiées ; 234 vulnérabilités en production | Confirmé | Next.js 16.4.6, better-auth retiré, mises à jour et `overrides` → **audit de production confirmé en CI (aucune vulnérabilité connue au contrôle effectué)** |
| better-auth sans base de données (option `databaseUrl` inexistante) | Confirmé | Remplacé par Supabase Auth (opérateurs uniquement) |
| `/login`, `/register`, `/dashboard`, `/studio` en 404 (réécriture next-intl) | Confirmé | Routes opérateurs exclues du routage de langue ; `/studio` retiré |
| Sanity installé, jamais interrogé par une page | Confirmé | Retiré ; schémas archivés |
| Supabase, Stripe, `pg` installés et inutilisés | Confirmé | Supabase réutilisé pour BIB ; Stripe et `pg` retirés |
| Aucun formulaire newsletter sur le site ; Luma inutilisé | Confirmé | Formulaire et liens Luma intégrés |
| Données State of BIB figées au 19 avril 2026 ; tâche hebdomadaire inactive | Confirmé | Contrôle quotidien conditionnel, désactivé par défaut |
| 5 erreurs ESLint | Confirmé | Corrigées |
| `pnpm-lock.yaml` et `package-lock.json` coexistants | Confirmé | `package-lock.json` supprimé |

## 2. Décisions techniques

- **Opérateurs hors segment de langue** : `src/app/(operateurs)/` (`/login`,
  `/admin/**`) avec son propre layout ; évite la réécriture next-intl qui
  rendait `/login` introuvable. Interface opérateur en français.
- **Routes historiques conservées** : `/register` devient une page
  d'information (inscription fermée), `/dashboard` redirige vers `/admin`.
- **Habilitations** : table `editors` + fonctions `security definer` ; aucune
  permission fondée sur `authenticated` seul ni sur `user_metadata`.
- **Médias** : bucket privé pour les imports, copie vers un bucket public à
  la publication (clé serveur, après contrôle d'habilitation), suppression au
  retrait. Aucune URL publique durable pour un brouillon.
- **Cache** : `unstable_cache` étiqueté (`events`, `stories`, `media`,
  `testimonials`, `state-of-bib`) et `updateTag` dans les actions serveur.
- **Événements** : catégorie temporelle calculée ; durée par défaut de deux
  heures utilisée uniquement pour l'état « en cours » quand la fin n'est pas
  saisie (jamais affichée).
- **State of BIB** : `build_data.py` écrit dans un dossier temporaire et ne
  remplace `public/data` qu'après validation ; historisation Supabase par
  `publish_supabase.py` ; lecture côté site avec repli automatique sur les
  JSON embarqués.
- **IA** : fournisseur non choisi ; deux adaptateurs HTTP génériques
  (« anthropic », « openai-compatible ») sans SDK supplémentaire ; budget
  d'appels par exécution ; sorties JSON validées ; chiffres insérés par le code
  via marqueurs ; tout chiffre libre fait échouer les contrôles.
- **Newsletter** : une seule génération pour FR et EN (mêmes éléments
  garantis) ; contrôles hors IA ; verrou par statut de cycle ; clé
  d'idempotence par langue ; réconciliation avec Brevo par nom de campagne ;
  aucun renvoi automatique.
- **Planification** : GitHub Actions appelant des routes protégées par
  `CRON_SECRET` ; toutes conditionnées par `BIB_SCHEDULES_ENABLED`.
- **Accueil** : sections héritées non sourcées conservées par défaut (design
  inchangé) ; drapeau `HOME_SHOW_UNVERIFIED_SECTIONS=false` pour les masquer.
- **Dépendances ajoutées** : `fast-xml-parser` (flux RSS/Atom), `server-only`.

## 3. Modules et chemins

### Créés

| Domaine | Chemins |
| --- | --- |
| Migrations | `supabase/migrations/20261112000{100..500}_*.sql`, `supabase/bootstrap/first_editor.sql` |
| Supabase / auth | `src/lib/env.ts`, `src/lib/supabase/{public,admin,proxy-session}.ts`, `src/lib/auth/editor.ts`, `src/lib/audit.ts`, `src/app/auth/callback/route.ts` |
| Opérateurs | `src/app/(operateurs)/layout.tsx`, `login/{page,LoginForm,actions}`, `dashboard/page.tsx`, `admin/**` |
| Événements | `src/lib/events/{types,temporal,queries,form}.ts`, `src/lib/time.ts`, `src/components/events/*`, `src/app/[locale]/(public)/evenements/[slug]/page.tsx` |
| BIB en action | `src/lib/stories/*`, `src/lib/media/{publication,preview}.ts`, `src/components/en-action/*`, `src/app/[locale]/(public)/en-action/**` |
| Administration UI | `src/components/admin/*`, `src/lib/admin/*` |
| State of BIB | `src/lib/sob/{load,insights}.ts`, `data-pipeline/{validate,check_version,publish_supabase,supabase_rest}.py` |
| Newsletter / IA / veille | `src/lib/newsletter/*`, `src/lib/ai/engine.ts`, `src/lib/news/ingest.ts`, `src/lib/ops/incidents.ts`, `src/lib/security/*`, `src/app/api/cron/**`, `src/components/newsletter/NewsletterForm.tsx`, `src/components/home/HomeModules.tsx` |
| Automatisations | `.github/workflows/{ci,newsletter,news-ingest}.yml` |
| Documentation | `README.md`, `CHANGELOG.md`, `.env.example`, `docs/*.md` |

### Modifiés

`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `src/proxy.ts`,
`src/lib/{brevo,luma}.ts`, `src/lib/supabase/{server,client}.ts`,
`src/app/api/newsletter/route.ts`, accueil (`page.tsx`), `evenements/page.tsx`,
`state_of_bib/page.tsx`, `login` et `register`, `Footer.tsx` (lien
newsletter), `SobMap.tsx`, `ErrorPage.tsx`, `Useparallax.tsx`,
`LocaleSwitcher.tsx`, `error.tsx`, `src/messages/{fr,en,es}.json` (libellés
d'interface des nouveaux modules ; liste des prestataires de la politique de
confidentialité), `data-pipeline/build_data.py`,
`.github/workflows/refresh-data.yml` (PR sur branche dédiée, jamais de push
sur `main`), `data-pipeline/supabase_rest.py` (en-tête `apikey` seul).

### Supprimés

`src/app/api/emails/welcome`, `src/app/api/auth`, `src/app/studio`,
`src/app/(membres)`, `src/sanity/**`, `sanity.config.ts`, `sanity.cli.ts`,
`src/lib/{auth,auth-client,stripe}.ts`, `src/components/hooks/useAuth.ts`,
`package-lock.json`. Dépendances retirées : `sanity`, `next-sanity`,
`@sanity/*`, `better-auth`, `stripe`, `@stripe/stripe-js`, `pg`, `@types/pg`,
`pnpm`, `styled-components`.

## 4. Opérations exécutées vs préparées

| Opération | Exécutée | Préparée seulement |
| --- | --- | --- |
| Code, migrations, workflows, documentation | ✓ (branche feature) | |
| Analyse syntaxique SQL (`pglast`) | ✓ | |
| Exécution des migrations sur PostgreSQL 16 **local et jetable** (substituts `auth`/`storage`), puis destruction | ✓ | |
| Migration sur une base distante | | ✓ |
| Création de projets Supabase / Brevo / IA | | ✓ |
| Activation des tâches planifiées | | ✓ (`BIB_SCHEDULES_ENABLED`) |
| Envoi d'e-mail ou de campagne | | ✓ (drapeaux) |
| Appel à un fournisseur IA | | ✓ (`FEATURE_AI`) |
| Déploiement de production | | ✓ |
| Export Sanity | | ✓ (commande documentée ; aucun accès au projet) |

Aucune base Supabase n'a été lue ni modifiée (les seuls projets accessibles
appartiennent à un autre produit et ont été exclus).

## 5. Contrôles statiques — résultats réellement observés en CI

Les résultats ci-dessous proviennent du workflow GitHub Actions
[`CI — contrôles statiques`](https://github.com/Pheniiix-Ankh-Group-Inc/akori/actions/runs/43492954457),
déclenché sur la PR #32 le **13 novembre 2026** au commit
`33716c4d7e8aa27a5c1702c8af25fd77f59913e7`.
Les deux jobs `web` et `data` sont terminés avec le statut **success**.

| Commande ou contrôle | Résultat constaté |
| --- | --- |
| `pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts` | **OK** — workflow ponctuel GitHub Actions ; lockfile généré au commit `2ab9b379`, workflow temporaire supprimé |
| `pnpm install --frozen-lockfile` | **OK en CI** — cohérence du lockfile confirmée |
| `pnpm lint` (ESLint) | **OK en CI** — aucune erreur bloquante |
| `pnpm typecheck` (TypeScript strict) | **OK en CI** |
| `pnpm build` | **OK en CI** — Next.js 16.4.6 **Turbopack**, compilation réussie et **56/56 pages statiques** générées |
| `pnpm audit --prod --audit-level=high` | **OK en CI** — sortie explicite : `No known vulnerabilities found` |
| `python -m py_compile data-pipeline/*.py` | **OK en CI** et également sur l'archive d'implémentation locale |
| `python data-pipeline/validate.py public/data` | **OK en CI** — validation exécutée sur le dépôt complet |
| `pglast` | **OK en CI** — les 5 migrations et `supabase/bootstrap/first_editor.sql` analysés syntaxiquement |
| Recherche de références aux secrets serveur dans `.next/static` | **OK en CI** — aucune occurrence détectée |
| Fusion JSON `fr/en/es` et contrôles de cohérence des workflows | **OK** — vérifiés sur la branche GitHub |
| Exécution locale ou distante de migrations SQL PostgreSQL | **NON EXÉCUTÉE**, conformément au périmètre : les migrations sont uniquement versionnées |
| Validation réelle des intégrations Supabase, Brevo et IA | **NON EXÉCUTÉE** — aucune ressource externe activée |

L'analyse SQL réussie en CI vérifie la **syntaxe**, pas l'application réelle
des politiques RLS ni le comportement fonctionnel des migrations sur une
base PostgreSQL. Ces vérifications restent nécessaires en staging dédié BIB.

**Aucun test automatisé ou E2E n'a été ajouté ni exécuté**, conformément
à la demande. Le runner a signalé des avertissements de dépréciation Node
des versions d'actions GitHub utilisées, sans échec de contrôle.

## Limitations et risques

1. **Rien n'est activé** : sans projet Supabase BIB, les pages Événements et BIB
   en action affichent un état vide, et l'administration est inaccessible.
2. **Comportement non vérifié en conditions réelles** : les intégrations
   Supabase, Brevo (double opt-in, campagnes) et IA n'ont pu être exécutées
   contre les services (pas de projet ni de clé). Une validation sur staging
   est indispensable avant toute activation.
3. **Ponctualité des tâches GitHub** : un retard de plus d'une heure le mercredi
   annule l'édition. Alternative documentée (Vercel Cron).
4. **Contrôle de langue heuristique** : il peut rejeter une édition correcte
   très courte ; il ne garantit pas la qualité de traduction.
5. **Classement thématique des actualités par mots-clés** : simple et sans IA ;
   certaines actualités peuvent rester sans thème (donc non retenues).
6. **Limitation de débit** : partagée via Supabase quand la clé serveur est
   configurée, sinon par instance (au mieux).
7. **Pages légales** : seule la liste des prestataires a été corrigée. Les
   mentions de comptes, paiements, portefeuilles et la Loi 25 / RGPD doivent
   être revues par un juriste ; aucune validation juridique n'est revendiquée.
8. **Accueil** : sections non sourcées affichées par défaut (décision
   éditoriale en attente).
9. **Coquilles historiques** (`membership`, `resources`, `press`, `contact`,
   `about`, `mission`) : conservées sans nouveau contenu, faute de textes
   validés.
10. **Vues `media_public` / `testimonials_public`** : propriétaires `postgres`
    (filtrage intégré) ; le linter Supabase les signalera.
11. **Remplacement de `public/data` non atomique** au niveau fichiers ; la
    cohérence publiée repose sur la PR (commit unique) ou sur la version
    Supabase courante.
12. **Envoi partiel Brevo** : détecté et signalé, jamais corrigé
    automatiquement.

## 6. Prochaines actions d'activation

1. Créer `bib-staging`, appliquer les migrations, inviter le premier opérateur.
2. Configurer les variables Vercel Preview → staging ; saisir un événement et
   une rétrospective réels.
3. Brevo staging : listes FR/EN, modèles double opt-in, nouvelle clé.
4. Choisir le fournisseur IA et les sources d'actualités autorisées.
5. Observer un cycle complet sur staging, puis décider de l'envoi automatique.
6. Décisions éditoriales : sections non sourcées de l'accueil, textes À propos
   et Mission, pages légales.
