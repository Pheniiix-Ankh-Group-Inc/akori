#!/usr/bin/env bash
# Valide les migrations BIB et exécute les tests SQL sur une base JETABLE.
# Usage : PGURL=postgresql://postgres@localhost:5432/postgres supabase/tests/run.sh
# Refuse toute URL pointant vers Supabase (*.supabase.co / pooler).
set -euo pipefail
: "${PGURL:?PGURL requis (base PostgreSQL jetable)}"
if [[ "$PGURL" == *supabase.co* || "$PGURL" == *supabase.com* || "$PGURL" == *pooler* ]]; then
  echo "Refus : ces tests ne s'exécutent jamais sur un projet Supabase." >&2
  exit 2
fi
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB="bib_test_$$"
psql "$PGURL" -v ON_ERROR_STOP=1 -qc "create database $DB"
trap 'psql "$PGURL" -qc "drop database if exists $DB" >/dev/null 2>&1 || true' EXIT
TARGET="${PGURL%/*}/$DB"
psql "$TARGET" -v ON_ERROR_STOP=1 -q -f "$DIR/tests/00_supabase_stub.sql"
psql "$TARGET" -v ON_ERROR_STOP=1 -q -f "$DIR/ops/00_preflight_bib.sql"
for f in "$DIR"/migrations/*.sql; do
  echo "migration: $(basename "$f")"
  psql "$TARGET" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null
done
for t in "$DIR"/tests/[1-9]*.sql; do
  psql "$TARGET" -v ON_ERROR_STOP=1 -f "$t"
done
