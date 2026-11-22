# Sécurité — Black in Blockchain

Ce document décrit les protections réellement implémentées, leurs limites et
la manière de les vérifier. Il complète `docs/ARCHITECTURE.md`.

## 1. En-têtes HTTP et CSP

Source unique : `src/lib/security/headers.ts`, utilisée par `next.config.ts`,
testée par `tests/unit/security-headers.test.ts` et vérifiée sur le build servi
par la CI (job `web`, étape « Security headers served by the build »).

| Directive | Valeur | Raison |
|---|---|---|
| `default-src` | `'self'` | Base restrictive |
| `script-src` | `'self' 'unsafe-inline'` (+ `'unsafe-eval'` en développement uniquement) | Scripts en ligne du App Router (voir limite ci-dessous) |
| `connect-src` | `'self'` + origine de `NEXT_PUBLIC_SUPABASE_URL` | Supabase Auth, PostgREST, envoi signé Storage |
| `img-src` / `media-src` | `'self' data: blob:` + origine Supabase | Médias publiés et aperçus signés ; `blob:` pour l'aperçu local d'import |
| `frame-src` | `'self'` + `lu.ma`, `luma.com` | Cadre d'inscription Luma éventuel |
| `object-src` | `'none'` | Aucun plugin |
| `base-uri`, `form-action`, `frame-ancestors` | `'self'` | Injection de base, détournement de formulaire, clickjacking |
| `upgrade-insecure-requests` | production | Aucune ressource http |

- L'origine Supabase est **dérivée de la variable d'environnement au build** :
  jamais de joker `*.supabase.co`. Changer de projet Supabase impose un
  nouveau build (Vercel le fait à chaque déploiement).
- Toutes les références Sanity ont été retirées (CSP, `images.remotePatterns`).
- HSTS : `max-age=31536000; includeSubDomains`, **sans `preload`**. L'inscription
  à la liste de préchargement des navigateurs est quasi irréversible et engage
  tous les sous-domaines : décision réservée au propriétaire du domaine.
- `X-XSS-Protection` (obsolète, parfois nuisible) supprimé ; `Referrer-Policy`,
  `Cross-Origin-Opener-Policy` ajoutés ; `X-Powered-By` désactivé.

**Limite connue** : `script-src 'unsafe-inline'` reste nécessaire tant qu'aucune
CSP à nonce n'est en place ; une CSP à nonce imposerait le rendu dynamique de
toutes les pages (impact performance et coût). Les injections sont traitées à
la source (section 2).

## 2. Injections DOM et HTML

- Les valeurs issues de données (noms de pays, chiffres State of BIB, libellés)
  sont insérées par `src/lib/dom/safe.ts` (nœuds texte, couleurs CSS validées).
  `SobMap` (infobulle) et `SobCohort` (légende) n'utilisent plus `innerHTML`.
- Les `dangerouslySetInnerHTML` restants lisent **uniquement** les fichiers de
  traduction versionnés du dépôt (source maîtrisée, revue en PR), jamais une
  donnée externe ou saisie en administration.
- Les textes saisis en administration et les actualités sont rendus comme
  texte par React. Le HTML des newsletters est produit par `render.ts` avec
  échappement.
- Tests : `tests/unit/dom-safe.test.ts` (charges XSS classiques).

## 3. Authentification et autorisation

- Opérateurs uniquement (Supabase Auth). Aucune inscription publique
  (`shouldCreateUser: false`).
- Chaque page et action d'administration appelle `requireEditor()` /
  `requireAdmin()` : jeton vérifié par Supabase (`getUser`), puis habilitation
  **active** lue dans `public.editors` (RPC `current_editor_role`). Les
  métadonnées utilisateur modifiables ne sont jamais utilisées.
- La base applique la même règle (RLS + `private.is_editor()`), y compris pour
  les fonctions transactionnelles (`SECURITY INVOKER` + `private.assert_editor()`).
- Aucun compte Auth historique n'obtient de rôle : il faut une ligne explicite
  dans `public.editors` (vérifié par la matrice SQL).
- Redirections : `next` limité à `/admin…` ; le retour des liens Auth redirige
  vers `/admin` sur l'origine canonique (`NEXT_PUBLIC_SITE_URL`).
- Messages d'erreur génériques (pas d'énumération des comptes ou abonnés).

## 4. Fonctions SQL privilégiées

| Fonction | Mode | Exécutable par |
|---|---|---|
| `private.is_editor`, `private.is_admin` | DEFINER, `search_path=''` | anon, authenticated (RLS) |
| `public.current_editor_role` | DEFINER | authenticated |
| `public.consume_rate_limit` | DEFINER | service |
| `public.promote_dataset_version`, `rollback_dataset_version` | DEFINER | service |
| `public.publish_dataset_version` | DEFINER | **personne** (révoquée en 0007) |
| `public.newsletter_validate_pair` | DEFINER | service |
| `public.media_storage_report` | DEFINER | service |
| `public.save_event`, `save_story`, `replace_story_media`, `transition_event`, `transition_story` | INVOKER | authenticated (RLS + garde éditeur) |

Tests : `supabase/tests/10_security_and_integrity.sql` vérifie que toute
fonction DEFINER fixe `search_path` et qu'aucune n'est exécutable par `anon`.

## 5. Secrets

- Clés serveur (`SUPABASE_SECRET_KEY`, `BREVO_API_KEY`, `AI_API_KEY`,
  `CRON_SECRET`, `NEWSLETTER_EMAIL_HASH_PEPPER`) : jamais préfixées
  `NEXT_PUBLIC_`, importées uniquement dans des modules `server-only`. La CI
  échoue si l'une apparaît dans `.next/static`.
- Journaux : `src/lib/ops/log.ts` masque e-mails, jetons Bearer et clés
  (`sb_secret_`, `xkeysib-`, `sk-…`) ; les incidents sont masqués avant stockage.
- Clé Supabase secrète transmise uniquement dans l'en-tête `apikey`.

## 6. API publiques et abus

- `/api/newsletter` : même origine exigée (CSRF), JSON uniquement, champ piège,
  schéma Zod, consentement explicite, limites par IP et par adresse.
- **Limiteur partagé, échec fermé** : en production, si le limiteur PostgreSQL
  est indisponible, la réponse est 503 (jamais une autorisation par défaut).
  Le compteur mémoire n'existe qu'en développement, borné à 5 000 clés.
- IP : `x-real-ip` puis premier `x-forwarded-for`, valeurs validées. Ces
  en-têtes ne sont fiables que derrière le proxy Vercel ; la limite par
  adresse e-mail reste effective dans tous les cas.
- Réponses : 400 (invalide), 403 (origine), 415 (type), 429 (limite),
  502 (Brevo), 503 (désactivé ou dépendance indisponible). Réponse identique
  qu'une adresse soit connue ou non.
- Tâches planifiées et `/api/ops/media-report` : `Authorization: Bearer
  CRON_SECRET` (32 caractères minimum, comparaison à temps constant).

## 7. Médias

- Import : URL signée vers le bucket **privé** ; type et taille contrôlés,
  puis **signature binaire réelle** des premiers octets (`src/lib/media/sniff.ts`) ;
  fichier refusé supprimé.
- Chemins imposés par les politiques Storage (0006) ; aucune écriture directe
  dans le bucket public par un client.
- Publication = copie vers le bucket public, uniquement si droits approuvés,
  référence et texte alternatif présents ; la base revérifie à la transition.
- Révocation : copie publique supprimée **avant** la mise à jour des droits.
  Cache : la suppression invalide l'objet sur le CDN Supabase ; une copie déjà
  téléchargée par un tiers ne peut pas être rappelée (limite inhérente).

## 8. Veille et IA

- URL de flux = entrée non fiable : https, DNS vérifié (aucune adresse privée
  ou réservée), redirections revalidées, 2 Mo et 20 s maximum, type de contenu
  contrôlé, DTD à entités refusées (`src/lib/net/*`). Limite : le « DNS
  rebinding » entre vérification et connexion n'est pas totalement exclu.
- Prompts : données externes délimitées comme non fiables ; le modèle ne
  rédige ni chiffre, ni lien, ni source ; contrôles bloquants indépendants du
  LLM (identifiants connus, chiffres sourcés, liens, conseil financier…).
- Réponses : JSON + Zod ; tronquées refusées ; un seul nouvel essai sur
  429/5xx ; budgets d'appels et de jetons par exécution ; aucune publication
  automatique d'un contenu non contrôlé.

## 9. Vérifier

```bash
pnpm test                       # en-têtes, XSS, SSRF, signatures, limiteur…
PGURL=postgresql://… pnpm test:sql   # base JETABLE uniquement
```

## 10. Dépendances npm — contrôles bloquants

- La CI exécute **les deux** commandes `pnpm audit --prod --audit-level=high` et
  `pnpm audit --audit-level=low`. La seconde inclut les outils de développement
  et leurs dépendances transitives ; elle reste bloquante dès la gravité **Low**,
  pour **toutes les vulnérabilités autres que l'exception unique documentée ci-dessous**.
  Ni `continue-on-error`, ni suppression du job, ni `--ignore-unfixable` n'est autorisé.
- `GHSA-fc5q-39xc-vjpf` / `CVE-2026-112366` : le chemin de production
  `next-intl -> @parcel/watcher -> picomatch` est retiré de la branche de
  correction, mais `picomatch@4.0.4` reste inclus via Vite/Vitest et d'autres
  outils de développement. **La dette de sécurité demeure ouverte**, même si
  l'audit production réussit. L'avis GitHub (consulté le 17-11-2026) ne publie
  aucune version officiellement corrigée.
- Ne pas prétendre que le produit est exempt de vulnérabilités sur la seule base
  d'une CI de production verte. Ne pas forcer une version fictive ni modifier
  artificiellement les métadonnées des dépendances pour obtenir un résultat vert.
  Suivre le fournisseur et examiner les versions corrigées ou alternatives
  maintenues et compatibles, puis supprimer l'exception dès qu'un correctif validé existe.

### Acceptation de risque TEMPORAIRE — GHSA-fc5q-39xc-vjpf

**Autorisation du propriétaire le 17 novembre 2026 :** avancer sur la fusion de
la PR #36 malgré cette vulnérabilité connue, sans neutraliser les autres audits.
Ce n'est **pas** une correction ni un effacement des alertes Dependabot.

| Champ | Décision |
|---|---|
| Identifiant unique autorisé | `GHSA-fc5q-39xc-vjpf` / `CVE-2026-112366` |
| Dépendance | `picomatch` jusqu'à la version `4.0.7` |
| Motif | Aucune version corrigée officielle au 17-11-2026 |
| Chaînes affectées à cette date | `eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch > picomatch` et `eslint-config-next > eslint-import-resolver-typescript > tinyglobby > picomatch` |
| Périmètre accepté | Outils ESLint de développement uniquement ; **pas** de chemin de production |
| Échéance stricte | **17 décembre 2026 (UTC)** ; échec CI dès cette date |
| Suivi | Issue [#37](https://github.com/Pheniiix-Ankh-Group-Inc/akori/issues/37) |
| Responsable | Mainteneur du projet BIB ; réévaluer au plus tard à l'échéance |

**Implémentation :** dans `pnpm-workspace.yaml`, `auditConfig.ignoreGhsas`
ne contient que cette GHSA, compatible avec `pnpm@10.28.0`.
Le workflow CI vérifie **avant l'audit complet** : une seule exception, le
respect de la date limite, et l'absence de `picomatch` dans le graphe de
dépendances de production (`pnpm why picomatch --prod`). Si l'un échoue,
**la CI échoue**. Chaque exécution émet un avertissement visible contenant la
référence de la vulnérabilité et de l'issue. L'audit de production et l'audit
complet restent obligatoires ; toute **autre** GHSA bloque la fusion.

À la publication d'une version corrigée, retirer la section
`auditConfig.ignoreGhsas`, mettre à jour le lockfile avec le résolveur pnpm,
exécuter les deux audits sans exception, puis clôturer l'issue #37.

- La page GitHub Security > Dependabot peut présenter **d'autres alertes**
  indépendantes de cette CVE : chacune doit être vérifiée et corrigée à la
  source sur le graphe de dépendances de la branche par défaut. Le connecteur
  GitHub utilisé par l'audit ne permet pas de lire cet inventaire privé.

### Dependency remediation — 17 novembre 2026 (PR #36)

Les captures Dependabot du propriétaire montrent 35 alertes ouvertes, dont 6 critiques. Les doublons `package.json` / `pnpm-lock.yaml` ne représentent pas des vulnérabilités indépendantes. Toutes les alertes affichées concernent les dépendances de développement, qui restent soumises à l'audit complet.

- Mise à jour de `happy-dom` de `18.0.1` vers `21.0.4` : corrige les avis relatifs à l'exécution de code, à l'injection et à la gestion des URLs, selon leurs versions officiellement corrigées.
- Mise à jour de `vitest` de `3.2.4` vers `5.1.0` : actualise également `@vitest/mocker` et le moteur de workers ; il faut toujours confirmer la compatibilité par les tests.
- Résolution des versions compatibles de `eslint` et `@tailwindcss/postcss`, avec actualisation des dépendances transitives `brace-expansion`, `js-yaml`, `nanoid` et `postcss` dans le lockfile.
- Mise à jour ciblée de `minimatch` pour `@typescript-eslint/typescript-estree` : forcer une version corrigée `>=11.0.1` via un override pnpm auditable, actuellement résolu en `11.0.9`. Validation du lint et des tests nécessaire après l'upgrade majeur.
- **`picomatch` reste dans l'outillage de développement**, et l'avis GHSA-fc5q-39xc-vjpf ne possède pas de version corrigée officielle à la date de ce rapport. Une **exception ciblée et temporaire**, approuvée le 17 novembre 2026 et détaillée ci-dessus, est autorisée pour permettre la fusion ; tout autre avis et tout chemin de production restent bloquants.
- Le statut de remédiation doit être vérifié par `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, et les deux audits **bloquants** (hors l'exception GHSA unique documentée). Toute autre vulnérabilité qui dépasse le seuil d'audit bloque la release.

## Séparation des RPC privilégiées (22 novembre 2026)

La migration `20261122205510_bib_harden_definer_rpc_exposure.sql` a **déjà été
appliquée** sur le projet partagé Supabase `akori` (référence
`zwfyuhgnbdrjhetkyanj`). Ne pas rejouer la migration sur cette base.

- `public.current_editor_role()` exécute sous l'identité du requérant et
  respecte la politique RLS de `public.editors`.
- Les cinq RPC sensibles gardent leurs noms et signatures publics, mais leurs
  points d'entrée sont désormais `SECURITY INVOKER` avec contrôles explicites
  de rôle. Les implémentations `SECURITY DEFINER` résident dans `private`,
  schéma non exposé par l'API PostgREST.
- Les rôles `authenticated` et `service_role` conservent les appels requis
  par les actions d'administration et le pipeline automatisé. Le rôle `anon`
  n'a aucun droit `EXECUTE` sur ces six points d'entrée.
- L'audit Supabase après application ne rapporte **plus aucune** des six
  alertes `authenticated_security_definer_function_executable`. Il conserve
  trois alertes informatives `rls_enabled_no_policy`, sur des tables privées
  accessibles uniquement côté service.

Les fichiers SQL reflètent l'état déjà appliqué, ils ne doivent pas être
exécutés manuellement une seconde fois sur le projet existant.
