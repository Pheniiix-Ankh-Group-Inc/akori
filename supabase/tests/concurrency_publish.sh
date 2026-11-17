#!/usr/bin/env bash
# Publications SIMULTANÉES de State of BIB : deux sessions PostgreSQL réelles.
# Vérifie que le verrou consultatif de publish_dataset_candidate (0013) donne
# un seul pointeur courant et qu'une version plus ancienne ne remplace jamais
# une plus récente. Usage : concurrency_publish.sh <url de la base jetable>
set -euo pipefail
T="${1:?URL de la base de test requise}"
q() { psql "$T" -v ON_ERROR_STOP=1 -qAt -c "$1"; }

q "update public.automation_settings set mode = 'auto' where module = 'sob';
   insert into public.data_sources (id, name, license, attribution) values ('race-source', 'Course', 'CC BY 4.0', 'Test') on conflict do nothing;
   insert into public.dataset_versions (id, source_id, provider_version, as_of_date, status, validation_report) values
     ('c0000000-0000-0000-0000-000000000001', 'race-source', 'r1', '2026-05-01', 'validated', '{\"passed\": true}'),
     ('c0000000-0000-0000-0000-000000000002', 'race-source', 'r2', '2026-06-01', 'validated', '{\"passed\": true}'),
     ('c0000000-0000-0000-0000-000000000003', 'race-source', 'r3', '2026-07-01', 'validated', '{\"passed\": true}'),
     ('c0000000-0000-0000-0000-000000000004', 'race-source', 'r0', '2026-04-01', 'validated', '{\"passed\": true}');
   insert into public.dataset_artifacts (dataset_version_id, name, storage_path, sha256, size_bytes)
   select v.id, f.n, 'race/' || v.provider_version || '/' || f.n, repeat('c', 64), 10 from public.dataset_versions v
   cross join (values ('meta.json'), ('headline.json'), ('country_map.json'), ('top_cities.json'), ('ecosystem_mix.json'), ('tenure_cohort.json')) f(n)
   where v.source_id = 'race-source';
   insert into public.metric_observations (dataset_version_id, metric_key, as_of_date, value)
   select id, 'devs_active_28d', as_of_date, 1 from public.dataset_versions where source_id = 'race-source';"

# Cas 1 : deux versions publiées en même temps. La première garde le verrou
# 2 s ; la seconde attend puis s'applique sur l'état réel.
( psql "$T" -v ON_ERROR_STOP=1 -q -c "begin; set local role service_role; select public.publish_dataset_candidate('c0000000-0000-0000-0000-000000000001'); select pg_sleep(2); commit;" >/dev/null ) &
sleep 0.5
start=$(date +%s%N)
psql "$T" -v ON_ERROR_STOP=1 -q -c "begin; set local role service_role; select public.publish_dataset_candidate('c0000000-0000-0000-0000-000000000002'); commit;" >/dev/null
waited=$(( ($(date +%s%N) - start) / 1000000 ))
wait
[ "$(q "select count(*) from public.dataset_versions where source_id = 'race-source' and is_current")" = "1" ] || { echo "ÉCHEC : plusieurs versions courantes"; exit 1; }
[ "$(q "select provider_version from public.dataset_versions where source_id = 'race-source' and is_current")" = "r2" ] || { echo "ÉCHEC : version courante inattendue"; exit 1; }
[ "$(q "select status::text from public.dataset_versions where id = 'c0000000-0000-0000-0000-000000000001'")" = "superseded" ] || { echo "ÉCHEC : r1 non historisée"; exit 1; }
[ "$waited" -ge 1000 ] || { echo "ÉCHEC : la seconde publication n'a pas attendu le verrou (${waited} ms)"; exit 1; }
echo "ok — publications simultanées sérialisées (attente ${waited} ms), un seul pointeur courant : r2"

# Cas 2 : une version plus ancienne arrive pendant la publication d'une plus
# récente : elle attend, puis est refusée (BIB04).
( psql "$T" -v ON_ERROR_STOP=1 -q -c "begin; set local role service_role; select public.publish_dataset_candidate('c0000000-0000-0000-0000-000000000003'); select pg_sleep(2); commit;" >/dev/null ) &
sleep 0.5
out=$(psql "$T" -q -c "begin; set local role service_role; select public.publish_dataset_candidate('c0000000-0000-0000-0000-000000000004'); commit;" 2>&1 || true)
wait
echo "$out" | grep -q "older than the current version" || { echo "ÉCHEC : version plus ancienne non refusée : $out"; exit 1; }
[ "$(q "select provider_version from public.dataset_versions where source_id = 'race-source' and is_current")" = "r3" ] || { echo "ÉCHEC : la version récente n'est pas courante"; exit 1; }
[ "$(q "select count(*) from public.dataset_versions where source_id = 'race-source' and is_current")" = "1" ] || { echo "ÉCHEC : plusieurs versions courantes"; exit 1; }
echo "ok — version plus ancienne refusée après attente, r3 reste courante"
echo "Tests de concurrence State of BIB passés."
