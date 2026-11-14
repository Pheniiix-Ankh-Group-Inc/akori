# Guide d'exploitation — Black in Blockchain

Procédures de surveillance, de diagnostic et de reprise. Aucune de ces
procédures ne relance automatiquement un envoi ou une publication.

## 1. Où regarder

| Signal | Où | Contenu |
|---|---|---|
| Journaux applicatifs | Vercel → Logs | Lignes JSON `{"event": "cron.newsletter.send.end", "correlationId": …, "durationMs": …, "status": …}` |
| Incidents | table `ops_incidents` ; `/admin/newsletter` | type, gravité, cycle, message masqué |
| Alertes | e-mail `OPS_ALERT_EMAIL_TO` si `FEATURE_OPS_ALERTS=true` | warnings et critiques |
| Exécutions State of BIB | table `ingestion_runs` | `version_check`, `build`, `publish` |
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

1. **Candidate** préparée (`dataset_versions.status = 'validated'`) + PR
   `data/state-of-bib-<version>` ouverte : relire la PR (chiffres, périmètre
   Afrique + Caraïbes, attribution CC BY 4.0).
2. **Fusion** de la PR → workflow « promotion après approbation » : vérifie les
   empreintes SHA-256 du commit fusionné et bascule la version courante.
3. **Échec de promotion** (`BIB06` : empreintes différentes) : la PR fusionnée ne
   correspond pas à la candidate (modification manuelle des JSON ?). La version
   précédente reste en ligne. Relancer une préparation (`force_build`) puis une
   nouvelle PR.
4. **Repli** : Actions → « State of BIB — promotion après approbation » →
   `rollback_version = <version précédente>`.
5. **Échecs répétés** (3 par version) : `check_version.py` cesse de relancer ;
   lire `ingestion_runs.message`, corriger, puis `force_build`.
6. **Exécution bloquée** (`running` > 2 h) : expirée automatiquement au
   lancement suivant.

Le site affiche toujours un ensemble cohérent : version courante complète,
sinon les JSON embarqués.

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
