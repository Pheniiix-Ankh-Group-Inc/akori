# Luma — diagnostic du flux et récupération des anciens événements

## Source vérifiée (17 novembre 2026)

- Calendrier BIB : `cal-aqEzCpUP5LXSBcL`
- Flux public : `https://api.lu.ma/ics/get?entity=calendar&id=cal-aqEzCpUP5LXSBcL`
- Vérification depuis GitHub Actions sans secrets : HTTP 200, `text/calendar`, **791 octets**, **1 VEVENT**, année de départ **2026**.
- Cette vérification confirme la disponibilité du flux, mais elle ne prouve pas que des événements historiques absents de ce flux sont accessibles. N’inventez jamais de dates ou titres historiques.

## Synchronisation prévue

1. À chaque push sur `main` après release, puis toutes les 10 minutes, `events-sync.yml` appelle `POST /api/cron/luma-sync` avec `BIB_SITE_URL` et `BIB_CRON_SECRET`.
2. Côté Vercel : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, et `CRON_SECRET` doivent pointer vers le seul projet Supabase `akori`; `LUMA_ICAL_URL` peut être omise pour utiliser automatiquement le flux BIB vérifié.
3. Le cron parse, valide et sauvegarde **toutes les entrées renvoyées**, sans limite de dates passées. Il ne supprime pas les anciennes fiches lorsque le flux change ; les absences sont historisées.
4. `/admin/evenements` affiche le journal de chaque synchronisation ; sur erreur 401, 503 ou 502, consultez les logs Vercel et GitHub Actions.

## Limite historique vérifiée

Le flux actuellement accessible ne renvoie qu’une entrée. Pour importer des événements antérieurs **non inclus** dans le flux : depuis le compte Luma propriétaire, exporter un historique `.ics` contenant ces événements, puis l’importer dans `/admin/evenements` (fonction déjà implémentée, limite 10 Mo). Ce chargement est idempotent et ne marque jamais les événements absents comme supprimés. Le calendrier iCal seul ne garantit pas de récupérer un événement absent de sa source.

## Contrôle SQL (lecture seule)

```sql
select count(*) as events, min(starts_at) as oldest, max(starts_at) as newest from public.events where source = 'luma';
select status, started_at, feed_events, created_count, updated_count, error
from public.event_sync_runs order by started_at desc limit 10;
```

Une base vide avec zéro exécution signifie que le déclenchement de synchronisation n’est pas encore parvenu à Supabase. Une exécution réussie avec un seul événement correspond au contenu actuellement publié par ce flux, pas à une perte de données effectuée par BIB.
