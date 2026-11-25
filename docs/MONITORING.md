# Monitoring, analytics et observabilité

État au 25 novembre 2026. Ce document décrit ce que BIB mesure, où le lire,
ce qui n'est pas encore disponible et les réglages à faire à la main.

## 1. Audit de l'existant (avant cette évolution)

| Mécanisme | État trouvé | Décision |
| --- | --- | --- |
| `@vercel/analytics` 2.0.1 | `<Analytics />` dans le layout public, URL complètes envoyées (paramètres compris) | Réutilisé, URL assainies (`beforeSend`), ajouté à l'espace opérateurs |
| `@vercel/speed-insights` 2.1.0 | `<SpeedInsights />` dans le layout public, activé dans Vercel | Réutilisé, URL assainies |
| Logs structurés `src/lib/ops/log.ts` | JSON une ligne, masquage (e-mails, jetons, clés), `withRun` (début, fin, durée, statut) | Réutilisé et étendu : spans OpenTelemetry, exceptions |
| Incidents `src/lib/ops/incidents.ts` + table `ops_incidents` | Enregistrement, alerte e-mail Brevo si `FEATURE_OPS_ALERTS=true` | Réutilisé pour les alertes CRON |
| Historique de tâches | `event_sync_runs` (Luma), `ingestion_runs` (State of BIB), `send_runs`, `newsletter_cycles` ; **rien** pour la veille, les étapes newsletter, le rafraîchissement State of BIB | Table générique `cron_runs` ajoutée (voir §6) |
| OpenTelemetry | Absent | `@vercel/otel` + `src/instrumentation.ts` |
| Événements métier | Aucun | `src/lib/analytics.ts` |
| Détection d'exécutions manquantes | Aucune | `/api/cron/health`, planifié par Vercel |
| `server-only` | Déjà installé | Réutilisé |

## 2. Bibliothèques

| Paquet | Version | Statut |
| --- | --- | --- |
| `@vercel/analytics` | 2.0.1 | réutilisé |
| `@vercel/speed-insights` | 2.1.0 | réutilisé |
| `@vercel/otel` | 2.3.0 | **ajouté** |
| `@opentelemetry/api` | 1.10.x | **ajouté** (requis par `@vercel/otel`, utilisé pour les spans de `withRun`) |
| `server-only` | 0.0.1 | réutilisé |

Les autres dépendances OpenTelemetry (`sdk-trace-base`, `resources`, etc.) sont
des dépendances de pair de `@vercel/otel`, résolues automatiquement par pnpm ;
aucune n'est déclarée en plus.

## 3. Ce qui est collecté

### Performance réelle — Vercel Speed Insights

Sur toutes les pages publiques et l'espace opérateurs (URL sans paramètres) :

- LCP, INP, CLS, FCP, TTFB et le score d'expérience réelle (Real Experience Score) ;
- par page et par route, par appareil (mobile, ordinateur) ;
- par navigateur, système et pays quand Vercel les fournit ;
- évolution dans le temps, sur la fenêtre de rétention du forfait.

### Audience — Vercel Web Analytics

- Visiteurs uniques, pages vues, pages les plus consultées ;
- sources de trafic (référents), pays, appareils, navigateurs, systèmes ;
- évolution du trafic.

Aucun cookie et aucun identifiant personnel ne sont utilisés. Les URL envoyées
sont réduites à origine + chemin (`scrubUrl`) : les jetons de connexion
(`/auth/callback?code=…`), codes et fragments ne quittent jamais le site. Seul
`?newsletter=confirmed` est conservé.

### Serveur — OpenTelemetry (`src/instrumentation.ts`, service `bib-web`)

- Spans Next.js (routes, rendu, actions) et spans `fetch` vers Supabase, Luma,
  Brevo et l'IA : durée, statut, erreurs, routes les plus lentes ;
- un span par tâche mesurée (`withRun` : `cron.luma-sync`, `cron.news`…), avec
  identifiant de corrélation, résumé assaini et exception enregistrée ;
- `onRequestError` : chaque erreur serveur capturée par Next.js produit une
  ligne `server.request_error` (type d'erreur, digest, route) **sans** le
  message brut, qui peut contenir des données.

Lecture : Vercel → projet → Observability (Traces, Logs). Aucun exporteur
externe n'est configuré ; un *Trace Drain* (Datadog, New Relic…) se branche
plus tard sans toucher au code. Désactivation d'urgence : `OTEL_SDK_DISABLED=true`.

### Logs structurés

Une ligne JSON par événement (`ts`, `level`, `event`, `correlationId`,
`durationMs`, `status`…), masquage systématique des e-mails, jetons, clés et
champs sensibles (`redact`). Les erreurs sont toujours relancées après
journalisation : rien n'est masqué.

## 4. Événements métier (`src/lib/analytics.ts`)

| Événement | Déclenchement réel | Propriétés (2 au plus) |
| --- | --- | --- |
| `newsletter_signup_success` | Retour du lien de confirmation du double opt-in (`?newsletter=confirmed`), une fois par session | `locale` |
| `newsletter_signup_failure` | Réponse d'erreur de `/api/newsletter` ou erreur réseau (pas « désactivé ») | `reason` (code générique) |
| `article_view` | Affichage d'une rétrospective BIB en action (`/en-action/[slug]`), une fois par page | `slug` |
| `article_read_complete` | Fin de l'article visible **après au moins 15 s** sur la page, une fois | `slug` |
| `state_of_bib_view` | Affichage de State of BIB, une fois par page | `version` |
| `outbound_click` | Clic sur un lien externe ; même hôte compté au plus une fois par seconde | `host` (nom d'hôte seul) |
| `dashboard_view` | Affichage de l'accueil de l'administration | `section` |
| `login_success` | Connexion réussie (mot de passe, ou lien magique validé) — côté serveur | `method` |
| `login_failure` | Échec de connexion — côté serveur, motif générique uniquement | `method`, `reason` |

Garanties testées (`tests/unit/monitoring-analytics.test.ts`) : liste fermée,
pas de doublon, propriétés sans e-mail, jeton, identifiant ni URL, 2
propriétés au plus, URL de pages vues assainies.

**Un clic n'est pas une conversion.** L'envoi du formulaire newsletter n'est
pas compté comme une inscription : seule la confirmation l'est.

## 5. Ce qui n'est pas disponible, et pourquoi

| Mesure | Raison | Pour l'obtenir |
| --- | --- | --- |
| Événements personnalisés dans Vercel | Le projet est sur le forfait **Hobby** : Vercel n'y enregistre que les pages vues | Passer en Pro (2 propriétés par événement) ; le code est déjà prêt |
| `event_registration_success` / `_failure` | L'inscription se fait sur Luma, hors du site : le site ne voit pas le résultat | Webhook Luma (offre Luma Plus) vers une route serveur, ou export Luma ; le clic vers Luma est compté comme `outbound_click`, jamais comme inscription |
| UTM, rétention > 1 mois (Analytics) | Forfait Hobby | Pro / Web Analytics Plus |
| Alertes Vercel sur taux d'erreur et dégradation de performance | Alertes d'Observability réservées aux forfaits payants | Pro ; en attendant, revue manuelle (§9) |
| Logs d'exécution au-delà d'une heure | Rétention Hobby : 1 h | Pro (1 jour) ou Log Drain |
| Métriques Supabase centralisées (Prometheus) | Pas de besoin de centralisation à ce stade | Metrics API Supabase + Grafana si nécessaire |
| Échecs d'authentification anormaux (alerte) | Pas de seuil côté Vercel Hobby ; Supabase Auth journalise mais n'alerte pas | Supabase Log Explorer (§7) ou Log Drain |

## 6. Supervision des tâches planifiées

### Couverture

| Tâche (`job`) | Déclencheur | Route | Historique | Seuils par défaut |
| --- | --- | --- | --- | --- |
| `luma-sync` | `events-sync.yml`, toutes les 10 min | `/api/cron/luma-sync` | `cron_runs` + `event_sync_runs` | manquante après 180 min, alerte après 3 échecs |
| `news` | `news-ingest.yml`, quotidien | `/api/cron/news` | `cron_runs` | 26 h, 1 échec ; non surveillée si `FEATURE_NEWS_INGEST` ≠ true |
| `newsletter` (generate, check, send) | `newsletter.yml`, quotidien | `/api/cron/newsletter` | `cron_runs` + `newsletter_cycles`, `send_runs` | 26 h, 1 échec |
| `sob-refresh` | `refresh-data.yml`, après chaque contrôle | `/api/cron/sob-refresh` (et l'ancien `/sob-insights`) | `cron_runs` + `ingestion_runs` | 26 h, 2 échecs |
| Pipeline State of BIB (Python) | `refresh-data.yml`, toutes les heures | GitHub Actions | `ingestion_runs`, journal Actions | suivi indirect par `sob-refresh` |
| `health` | **Vercel Cron**, chaque jour à 12:23 UTC | `/api/cron/health` | logs | — |

Chaque exécution enregistre : tâche, déclencheur, début, fin, durée, statut
(`running`, `success`, `failed`, `skipped`), nombre d'éléments, tentative,
identifiant de corrélation, identifiant d'exécution GitHub (`X-BIB-Run-Id`),
erreur assainie. Dernière réussite = dernière ligne `success`.

Une édition de newsletter bloquée ou annulée est un **résultat métier** (déjà
signalé par l'orchestrateur dans `ops_incidents`), pas un échec technique de la
tâche.

### Contrôle de santé (`/api/cron/health`)

Planifié par Vercel (indépendant de GitHub Actions, qu'il surveille). Il
signale `missing` (aucun démarrage depuis le seuil), `failing` (échecs
consécutifs), `stuck` (« running » depuis plus de 15 min), enregistre un
incident `cron.<constat>` par tâche **au plus une fois toutes les 12 h**, et
purge l'historique au-delà de 90 jours. Seuils et fenêtre réglables sans
déploiement (voir §10).

Pourquoi les planifications rapprochées sont surveillées avec de la marge :
GitHub Actions retarde ou saute souvent les créneaux toutes les 10 minutes
(constaté : 1 à 10 synchronisations Luma par jour en novembre 2026).

### Requêtes utiles (SQL Editor Supabase)

```sql
-- Dernière exécution et dernière réussite par tâche
select job,
       max(started_at) as derniere_execution,
       max(started_at) filter (where status = 'success') as derniere_reussite,
       count(*) filter (where status = 'failed' and started_at > now() - interval '24 hours') as echecs_24h
from cron_runs group by job order by job;

-- Incidents des 7 derniers jours
select created_at, kind, severity, message from ops_incidents
where created_at > now() - interval '7 days' order by created_at desc;
```

## 7. Supabase

Outils natifs, sans code supplémentaire :

| Besoin | Où |
| --- | --- |
| Connexions PostgreSQL, CPU, mémoire, disque | Dashboard → Reports → Database |
| Requêtes lentes, performance des requêtes | Dashboard → Query Performance (`pg_stat_statements`) |
| Erreurs de base, journaux Postgres | Logs → Postgres |
| Requêtes Auth échouées | Logs → Auth (filtrer `status >= 400`) |
| Opérations Storage | Logs → Storage ; Reports → Storage |
| Sécurité et performance du schéma | Advisors (Security, Performance) |
| Erreurs d'intégration côté site | Logs Vercel (`ops.*`, `cron.*`, `server.request_error`) |

La clé privilégiée reste côté serveur uniquement (`SUPABASE_SECRET_KEY`,
`server-only`). La Metrics API compatible Prometheus n'est utile que si l'on
centralise plus tard dans Grafana ou Datadog.

## 8. Alertes

| Alerte | Mécanisme | État |
| --- | --- | --- |
| CRON en échec | `/api/cron/health` → `ops_incidents` → e-mail | prêt, e-mail si `FEATURE_OPS_ALERTS=true` |
| CRON non exécuté à l'heure | idem (`cron.missing`) | prêt |
| Échec de génération newsletter | orchestrateur → `ops_incidents` (existant) | actif |
| Échec de synchronisation Luma | `cron.failing` après 3 échecs | prêt |
| Problème de connexion Supabase | `/api/cron/health` répond 503 ; Vercel Cron le montre en échec | prêt |
| Taux d'erreur API élevé, dégradation de performance | Alertes Vercel Observability | **Pro uniquement** |
| Échecs d'authentification anormaux | Supabase Logs → Auth | revue manuelle |

Pas d'alerte répétitive : une alerte par tâche et par constat toutes les 12 h
(réglable).

## 9. Tableaux de bord

Décision : outils natifs, pas de nouvelle interface d'administration.

- Vercel → Speed Insights, Analytics, Observability (Traces, Logs), Cron Jobs ;
- Supabase → Reports, Query Performance, Logs, Advisors ;
- SQL ci-dessus pour `cron_runs` et `ops_incidents`.

Développement possible plus tard : une page « Santé » dans `/admin` lisant
`cron_runs` et `ops_incidents` (lecture éditeurs déjà autorisée par RLS).

## 10. Variables d'environnement

| Variable | Où | Rôle | Défaut |
| --- | --- | --- | --- |
| `CRON_SECRET` | Vercel (Production) | Authentifie GitHub Actions **et** Vercel Cron (`/api/cron/health`) | requis |
| `FEATURE_OPS_ALERTS` | Vercel | Envoie les incidents par e-mail | `false` |
| `OPS_ALERT_EMAIL_TO` | Vercel | Destinataire des alertes | — |
| `MONITORING_CRON_THRESHOLDS` | Vercel (optionnel) | JSON de seuils, ex. `{"luma-sync":{"maxGapMinutes":240,"failAfter":3}}` | seuils §6 |
| `MONITORING_ALERT_COOLDOWN_HOURS` | Vercel (optionnel) | Fenêtre anti-doublon des alertes (1 à 168) | `12` |
| `OTEL_SDK_DISABLED` | Vercel (optionnel) | `true` coupe OpenTelemetry | non défini |

Aucune nouvelle clé secrète.

## 11. Configurations manuelles

1. **Supabase** : appliquer la migration `20261125000100_bib_cron_runs.sql`
   (sans elle, les tâches tournent normalement mais ne sont pas historisées,
   et `/api/cron/health` répond 503).
2. **Vercel** :
   - Speed Insights et Web Analytics : déjà activés ;
   - Observability → Traces : vérifier que les traces apparaissent après le
     premier déploiement ;
   - Cron Jobs : vérifier que `/api/cron/health` est listé après la mise en
     production (les crons Vercel ne tournent que sur la production) ;
   - alertes e-mail : `FEATURE_OPS_ALERTS=true` et `OPS_ALERT_EMAIL_TO`.
3. **GitHub** : rien d'obligatoire ; les workflows transmettent déjà
   `X-BIB-Run-Id` et `X-BIB-Run-Attempt`.

## 12. Coûts et quotas (forfait Hobby, novembre 2026)

| Outil | Quota | Au-delà |
| --- | --- | --- |
| Web Analytics | 50 000 événements par mois (pages vues), rétention 1 mois | collecte suspendue jusqu'au mois suivant (pas de facturation) |
| Speed Insights | 10 000 points de données sur 30 jours glissants | collecte suspendue ; réduire `sampleRate` si besoin |
| Traces OpenTelemetry | inclus dans le traçage Vercel, rétention selon forfait | Trace Drain = option payante |
| Vercel Cron | Hobby : exécution quotidienne, précision à l'heure | — |
| `cron_runs` | environ 200 lignes par jour au rythme actuel, purge à 90 jours | négligeable |

Impact performance : scripts Analytics et Speed Insights chargés après
l'affichage ; aucun appel analytics côté serveur ne bloque plus de 800 ms ;
l'historisation CRON ne bloque jamais une tâche.

## 13. Confidentialité

- Aucune adresse e-mail, aucun jeton, mot de passe, identifiant personnel ou
  URL complète n'est envoyé aux outils d'analytics.
- Les logs et `cron_runs.error` passent par `redact` (e-mails, jetons Bearer,
  clés `sb_secret_`, `xkeysib-`, `sk-`…).
- Les secrets des CRON ne sont jamais journalisés (en-tête `Authorization`
  uniquement, comparaison en temps constant).
