# State of Black in Blockchain — data pipeline

Weekly pipeline that reads the [Electric Capital developer dataset](https://opendevdata.org)
and writes six JSON files for the editorial dashboard on
[anbachain.org](https://anbachain.org).

Scope is **strictly Africa + Caribbean** (76 countries/territories — see
`country_scope.py`). Diaspora developers outside those regions are not
counted; the page acknowledges this in its methodology section.

## What it produces

| File                  | Feeds                | Rough size |
| --------------------- | -------------------- | ---------- |
| `meta.json`           | page footer + header | < 2 KB     |
| `headline.json`       | hero stats           | < 1 KB     |
| `country_map.json`    | choropleth map       | ~10 KB     |
| `top_cities.json`     | top-cities bar       | < 2 KB     |
| `ecosystem_mix.json`  | indexed line chart   | ~15 KB     |
| `tenure_cohort.json`  | stacked area         | ~10 KB     |

Everything stays browser-friendly — no client pays for a 5 GB parquet.

## Run locally

```bash
pip install -r requirements.txt
python build_data.py
```

Output lands in `./data/`. First run prints every table's schema — use
that to patch any column-name drift in `build_data.py`.

## How it pulls data

DuckDB's `httpfs` extension reads parquets directly over HTTPS. Only
the row groups and columns each query touches are fetched, so running
the full pipeline pulls tens of MB, not the full ~50 GB snapshot.

Dataset version is read from
`https://data.opendevdata.org/manifest.json` at start; file URLs are
built from the version string, so a new snapshot is picked up
automatically on the next run.

## Editing the scope

Edit `country_scope.py`:

- `AFRICA_ISO_A3` / `CARIBBEAN_ISO_A3` — ISO alpha-3 codes included.
- `NAME_OVERRIDES` — raw country-name strings from the EC dataset that
  pycountry can't resolve on its own.

The script prints `unresolved_country_names` at run time — anything in
that list that looks in-scope should be added to `NAME_OVERRIDES`.

## Scheduled refresh

`.github/workflows/refresh-data.yml` runs the pipeline every Monday at
06:00 UTC and commits the refreshed `data/` folder back to the repo.
Manual runs available from the Actions tab.

## Methodology, briefly

- Developer locations are inferred by Electric Capital from GitHub
  profile + commit metadata; they are not self-declared.
- "Active developer" = at least one tracked activity in the last 28
  days of the snapshot.
- "Commits last 12 months" = the last 365 days of the snapshot.
- Tenure buckets (0–1y, 1–2y, 2y+) are measured as months since the
  developer's first tracked commit on any ecosystem.
- Ecosystem active-dev series are indexed to 100 at the first non-zero
  month so growth shapes can be compared across volumes.
