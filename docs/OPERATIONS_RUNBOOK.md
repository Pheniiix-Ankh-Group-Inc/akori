# Guide d'exploitation — Black in Blockchain

Procédures de surveillance, de diagnostic et de reprise. Aucune de ces
procédures ne relance automatiquement un envoi de newsletter. State of BIB,
lui, est publié et repris automatiquement (section 3).

## 1. Où regarder

| Signal | Où | Contenu |
|---|---|---|
| Journaux applicatifs | Vercel → Logs | Lignes JSON `{"event": "cron.newsletter.send.end", "correlationId": …, "durationMs": …, "status": …}` |
| Incidents | table `ops_incidents` ; `/admin/newsletter` | type, gravité, cycle, message masqué |
| Tâches planifiées | table `cron_runs` ; contrôle quotidien `/api/cron/health` (Vercel Cron) | dernière exécution, dernière réussite, échecs, exécutions manquantes — voir [Monitoring](MONITORING.md) |
| Alertes | e-mail `OPS_ALERT_EMAIL_TO` si `FEATURE_OPS_ALERTS=true` | warnings et critiques |
| Exécutions State of BIB | table `ingestion_runs` ; `/admin/state-of-bib` | `version_check`, `build`, `publish`, `reconcile` |
| Synchronisations Luma | table `event_sync_runs` ; `/admin/evenements` | statut, compteurs, erreur |
| Appels IA | table `ai_runs` | statut, jetons, erreur (sans contenu) |
| Envois | table `send_runs` | statut par langue, campagne Brevo |
| Médias | `GET /api/ops/media-report` (Bearer `CRON_SECRET`) | incohérences fichiers ↔ fiches |

Un `correlationId` relie le début et la fin d'une tâche dans les journaux.

## 2. Newsletter

| Situation | Statut | Action |
|---|---|---|
| Pas d'édition lundi (IA désactivée/indisponible) | `blocked` | Vérifier `ai_runs` ; la semaine est annulée mercredi, aucun rattrapage |
| Contrôles en échec après 2 régénérations | `blocked` | Lire `edition_checks` ; corriger les sources ; semaine annulée |
| Exécution GitHub en retard (> 09:59) | `cancelled` | Normal : aucun envoi tardif |
| FR envoyé, EN en échec | `partially_sent` (critique) | Vérifier la campagne EN dans Brevo. **Ne jamais renvoyer FR.** Décision humaine pour EN |
| Résultat incertain (`send_runs.status = unknown`) | `failed` (critique) | Vérifier dans Brevo par le nom `BIB newsletter <semaine> <LANGUE>` avant toute action |
| Cycle resté `sending` > 30 min | `failed` + incident `newsletter.stuck_sending` | Même vérification ; aucun renvoi automatique |

Brevo est la source de vérité pour les contacts, confirmations et
désabonnements.

### Consentements à réconcilier

Lignes `newsletter_consents.status = 'pending'` plus anciennes que 1 h : la
demande a pu partir sans que l'état final soit enregistré.

```sql
select id, locale, created_at from public.newsletter_consents
where status = 'pending' and created_at < now() - interval '1 hour';
```

Vérifier dans Brevo (contact en attente de confirmation) ; si la demande est
bien partie, passer la ligne à `requested`, sinon `request_failed`. Ne jamais
renvoyer une demande sans nouvelle action de la personne.

## 3. State of BIB

Le cycle normal ne demande aucune action (`SOB_AUTOMATION.md`). Les points
ci-dessous servent au diagnostic.

1. **Version publiée automatiquement** : visible dans `/admin/state-of-bib`
   (version courante, rapport de validation, journal).
2. **Version en quarantaine** (contrôles renforcés non confirmés) : la dernière
   version valide reste en ligne ; nouvelle tentative automatique toutes les
   24 h, cinq fois au plus, ou dès que la source ou le pipeline change.
3. **Échec de vérification après publication** (`sob.desync`) : retour
   automatique à la version précédente et incident critique.
4. **Repli manuel** : « Restaurer cette version » dans `/admin/state-of-bib`,
   ou `python publish_supabase.py rollback --version <version>`.
5. **Échecs répétés** (3 par version) : `check_version.py` cesse de relancer ;
   lire `ingestion_runs.message`, corriger, puis `force_build`.
6. **Exécution bloquée** (`running` > 2 h) : expirée automatiquement au
   lancement suivant.

Le site affiche toujours un ensemble cohérent : version courante complète,
sinon la copie technique du dépôt si elle est valide et récente, sinon un état
d'indisponibilité sans chiffre.

7. **Données anciennes** (plus de 120 jours) : avertissement sur la page et
   dans `/admin`, annotation `stale` du workflow horaire. Vérifier la
   dernière version du manifeste Electric Capital, lancer « State of BIB —
   pipeline automatique » avec `force_build` (ou « Vérifier la source maintenant »
   dans `/admin/state-of-bib`) : la version valide est publiée automatiquement.
8. **Contrôles d'un lot** (faits automatiquement à l'ingestion) :
   `python data-pipeline/validate.py --consistency data/state-of-bib/current` (aucune
   incohérence entre fichiers), `python data-pipeline/history.py --check`
   (versions précédentes intactes), date `snapshot_date` plausible.
9. **Restaurer une version** : `/admin/state-of-bib` → « Restaurer cette
   version » (bascule atomique, journalisée). Les copies du dépôt
   (`data/state-of-bib/history/<version>/`, `SHA256SUMS`) servent à la reprise interne.
10. **Incohérence base / fichiers** (`sob.desync`) : « Vérifier la cohérence »
    dans `/admin/state-of-bib` ; si Storage diffère de PostgreSQL, restaurer la
    version précédente puis relancer le traitement de la version en cause.

## 4. Médias

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/ops/media-report | jq .counts
```

| Problème | Action manuelle |
|---|---|
| `public_without_rights` | **Urgent** : supprimer la copie publique (admin → média → droits « révoqués ») |
| `public_object_missing` | Republier le contenu concerné (la copie est recréée) |
| `draft_object_missing` | Réimporter le fichier ou supprimer la fiche (si inutilisée) |
| `public_object_orphan` / `draft_object_orphan` | Supprimer l'objet dans Storage après vérification |

Le rapport ne supprime jamais rien.

## 5. Veille

`news_sources.last_status` indique l'erreur par source (`private_address`,
`https_required`, `content_type_not_feed`, `too_large`, `http_404`…). Une
source en erreur n'interrompt pas les autres. Corriger l'URL ou désactiver la
source (`enabled = false`).

## 6. Incident de sécurité

1. Désactiver la fonctionnalité concernée (`FEATURE_*=false`, redéploiement).
2. Régénérer la clé exposée (Supabase, Brevo, IA, `CRON_SECRET`, poivre).
3. Consigner l'incident dans `ops_incidents` (gravité `critical`).
4. Retour arrière : déploiement Vercel précédent.

## 7. Accès à l'administration

- Entrée : lien « Espace équipe » (pied de page) → `/login` → `/admin`.
- Ajouter un opérateur : l'inviter (Auth > Users), puis l'inscrire dans
  `public.editors` (rôle `editor` ou `admin`) par un administrateur.
- Révoquer : `active = false` (effet immédiat). Un compte Auth sans ligne
  active dans `editors` n'accède à aucune page ni action d'administration.
- Aucun administrateur BIB n'existe encore sur `akori` (vérifié le 16 novembre
  2026) : suivre la procédure du premier opérateur (`DEPLOYMENT.md` § 5).


## V2 — architecture cible

La V2 (Luma source de vérité des événements, State of BIB publié automatiquement depuis Supabase, modes auto/review/paused, édition humaine de la newsletter, migrations 0011 à 0013) est décrite dans [`V2_ARCHITECTURE_CIBLE.md`](V2_ARCHITECTURE_CIBLE.md) et [`SOB_AUTOMATION.md`](SOB_AUTOMATION.md). En cas de divergence avec une section plus ancienne de ce document, ces deux guides font foi.
