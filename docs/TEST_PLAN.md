# Plan de tests — Black in Blockchain

Aucun test ne contacte un service réel (Supabase, Brevo, IA, sources RSS) ni
n'utilise de données réelles. Les fixtures sont fictives.

## 1. Suites automatisées

| Suite | Commande | Où | Contenu |
|---|---|---|---|
| Unitaires et sécurité | `pnpm test` | CI `web`, local | 8 fichiers `tests/unit/*.test.ts` |
| Pipeline State of BIB | `python -m unittest discover -s data-pipeline/tests` | CI `data` | Gouvernance candidate/promotion avec faux client |
| SQL / RLS | `PGURL=… bash supabase/tests/run.sh` | CI `sql` (conteneur PostgreSQL 16) | Préflight, 8 migrations sur base vierge, 4 fichiers de tests |
| Statiques | `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm audit --prod` | CI `web` | |
| En-têtes servis | étape CI | CI `web` | CSP, HSTS sans preload, nosniff, pas de `X-Powered-By` |

`supabase/tests/run.sh` refuse toute URL Supabase : il crée une base
temporaire, applique `00_supabase_stub.sql` (rôles et schémas équivalents à
Supabase), le préflight, les migrations, puis les tests, et supprime la base.

## 2. Couverture des risques

| Risque | Test |
|---|---|
| XSS via données (pays, chiffres) | `dom-safe.test.ts` |
| CSP trop ouverte / Sanity résiduel / HSTS preload | `security-headers.test.ts`, étape CI |
| Fichier déguisé (type déclaré ≠ contenu) | `media-sniff.test.ts` |
| SSRF par URL de flux, redirections, DTD | `ssrf.test.ts`, `news-ai-ops.test.ts` |
| Envoi hors fenêtre, heure d'été, exécution retardée | `newsletter-schedule.test.ts` |
| Limiteur contourné en panne, concurrence, IP falsifiée, CSRF | `api-guards.test.ts` |
| Chiffres non sourcés affichés, jour d'envoi contradictoire, clés i18n | `content-claims.test.ts` |
| Hallucination JSON, conseil financier, fuite de secrets dans les logs | `news-ai-ops.test.ts` |
| Accès non autorisés (6 profils) | `10_security_and_integrity.sql` |
| Écriture partielle (traduction invalide), conflit concurrent, double clic | `10_security_and_integrity.sql` |
| Perte de galerie en cas d'échec, média sans droits ou sans texte alternatif | `10_security_and_integrity.sql` |
| Suppression d'un média publié, chemins Storage | `10_security_and_integrity.sql` |
| Publication State of BIB non approuvée, empreinte modifiée, repli | `20_sob_governance.sql`, `test_governance.py` |
| Paire FR/EN incohérente, contenu validé modifié, double envoi | `30_newsletter_integrity.sql` |

## 3. Vérifications NON automatisées (staging BIB requis)

Ces scénarios exigent de vrais services ; ils sont à exécuter sur un projet
Supabase de **staging BIB** isolé, avec Brevo en listes de test et l'IA en
mode budget minimal, sans toucher à la production :

1. Connexion opérateur (mot de passe, lien magique), refus d'un compte sans rôle.
2. Création, publication, archivage d'un événement ; affichage public.
3. Import d'une image et d'une vidéo (URL signée, CSP réelle), approbation des
   droits, publication d'une rétrospective, révocation et retrait effectif
   (vérifier l'URL publique après révocation).
4. Inscription newsletter : double opt-in reçu, confirmation dans Brevo,
   état `requested` en base ; doublon dans les 24 h.
5. Cycle simulé : génération (IA de test), contrôle, validation de la paire,
   annulation hors créneau ; `FEATURE_NEWSLETTER_AUTOSEND=false` tant que la
   recette n'est pas validée.
6. State of BIB : préparation d'une candidate, PR, fusion, promotion, repli.
7. Rapport `/api/ops/media-report` sur données réelles de staging.

## 4. Résultats

Les résultats d'exécution sont consignés dans
`docs/audits/BIB_REMEDIATION_REPORT.md` (section D) avec la date et
l'environnement. Ne jamais recopier un résultat non observé.
