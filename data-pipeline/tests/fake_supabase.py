"""Supabase simulé EN MÉMOIRE pour les tests du pipeline (aucun réseau).

Reproduit le sous-ensemble utilisé : filtres PostgREST simples, Storage privé
immuable, et les règles des RPC publish_dataset_candidate (migration 0013) et
restore_dataset_version.
"""
from __future__ import annotations

import itertools
from datetime import datetime, timezone

from supabase_rest import SupabaseError

_ids = itertools.count(1)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class FakeSupabase:
    def __init__(self, mode: str | None = "auto"):
        self.t: dict[str, list[dict]] = {k: [] for k in (
            "dataset_versions", "dataset_artifacts", "metric_observations", "dataset_version_deltas", "ingestion_runs", "ops_incidents", "automation_settings")}
        if mode is not None:
            self.t["automation_settings"].append({"module": "sob", "mode": mode})
        self.objects: dict[str, bytes] = {}
        self.rpcs: list[str] = []
        self.uploads: list[str] = []
        self.tamper_after_upload: str | None = None

    # ── lecture ────────────────────────────────────────────────────────
    @staticmethod
    def _match(row: dict, key: str, cond: str) -> bool:
        value = row.get(key)
        if cond.startswith("eq."):
            want = cond[3:]
            if want in ("true", "false"):
                return bool(value) is (want == "true")
            return str(value) == want
        if cond.startswith("in.("):
            return str(value) in cond[4:-1].split(",")
        if cond.startswith("lt."):
            return value is not None and str(value) < cond[3:]
        if cond.startswith("lte."):
            return value is not None and str(value) <= cond[4:]
        if cond.startswith("neq."):
            return str(value) != cond[4:]
        if cond.startswith("like."):
            prefix = cond[5:].rstrip("*")
            return str(value).startswith(prefix)
        return True

    def select(self, table: str, params: dict) -> list[dict]:
        rows = self.t[table]
        for key, cond in params.items():
            if key in ("select", "order", "limit", "offset"):
                continue
            if key == "or":
                parts = cond.strip("()").split(",")
                alts = [p.split(".", 1) for p in parts]
                rows = [r for r in rows if any(self._match(r, k, c) for k, c in alts)]
                continue
            rows = [r for r in rows if self._match(r, key, cond)]
        if "order" in params:
            for spec in reversed(params["order"].split(",")):
                col, _, direction = spec.partition(".")
                rows = sorted(rows, key=lambda r: (r.get(col) is None, r.get(col) or ""), reverse=direction == "desc")
        if "offset" in params:
            rows = rows[int(params["offset"]):]
        if "limit" in params:
            rows = rows[: int(params["limit"])]
        out = [dict(r) for r in rows]
        if table == "dataset_versions" and "dataset_artifacts" in params.get("select", ""):
            for r in out:
                r["dataset_artifacts"] = [dict(a) for a in self.t["dataset_artifacts"] if a["dataset_version_id"] == r["id"]]
        return out

    # ── écriture ───────────────────────────────────────────────────────
    def insert(self, table: str, rows, *, on_conflict: str | None = None, ignore_duplicates: bool = False, returning: bool = True):
        out = []
        for row in rows if isinstance(rows, list) else [rows]:
            if on_conflict:
                keys = on_conflict.split(",")
                if any(all(x.get(k) == row.get(k) for k in keys) for x in self.t[table]):
                    continue
            if table == "dataset_versions" and any(
                    x["source_id"] == row["source_id"] and x["provider_version"] == row["provider_version"] for x in self.t[table]):
                raise SupabaseError("duplicate (source_id, provider_version)")
            if table == "ingestion_runs" and row.get("status") == "running" and any(
                    x["status"] == "running" and x["kind"] == row["kind"] for x in self.t[table]):
                raise SupabaseError("duplicate running run")
            new = {"id": f"id-{next(_ids)}", "created_at": _now(), "started_at": _now(), "is_current": False, "attempts": 0, **row}
            self.t[table].append(new)
            out.append(dict(new))
        return out if returning else []

    def update(self, table: str, match: dict, values: dict) -> None:
        for r in self.t[table]:
            if all(self._match(r, k, c) for k, c in match.items()):
                r.update(values)

    def delete(self, table: str, match: dict) -> None:
        assert match, "delete sans filtre"
        self.t[table] = [r for r in self.t[table] if not all(self._match(r, k, c) for k, c in match.items())]

    # ── Storage privé, objets immuables ────────────────────────────────
    def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> bool:
        assert bucket == "bib-sob-candidates", "seul le bucket privé est utilisé"
        self.uploads.append(path)
        if path in self.objects:
            return False
        self.objects[path] = b"{}" if self.tamper_after_upload and path.endswith(self.tamper_after_upload) else content
        return True

    def download(self, bucket: str, path: str):
        assert bucket == "bib-sob-candidates"
        return self.objects.get(path)

    # ── RPC ────────────────────────────────────────────────────────────
    def _mode(self) -> str:
        rows = [r for r in self.t["automation_settings"] if r["module"] == "sob"]
        return rows[0]["mode"] if rows else "paused"

    def rpc(self, fn: str, args: dict):
        self.rpcs.append(fn)
        versions = self.t["dataset_versions"]
        row = next((v for v in versions if v["id"] == args["p_version_id"]), None)
        if row is None:
            raise SupabaseError("BIB02 dataset version not found")
        if fn == "publish_dataset_candidate":
            if self._mode() != "auto":
                raise SupabaseError(f"BIB09 automatic publication requires mode auto (current: {self._mode()})")
            if row["status"] == "published" and row["is_current"]:
                return "noop"
            if row["status"] != "validated":
                raise SupabaseError(f"BIB04 only a validated candidate can be published (status={row['status']})")
            if not (row.get("validation_report") or {}).get("passed"):
                raise SupabaseError("BIB06 validation report missing or failed")
            if sum(1 for a in self.t["dataset_artifacts"] if a["dataset_version_id"] == row["id"]) < 6:
                raise SupabaseError("BIB06 incomplete artifact set")
            if not any(o["dataset_version_id"] == row["id"] for o in self.t["metric_observations"]):
                raise SupabaseError("BIB06 no observation recorded")
            cur = next((v for v in versions if v["source_id"] == row["source_id"] and v["is_current"]), None)
            if cur and str(row["as_of_date"]) < str(cur["as_of_date"]):
                raise SupabaseError("BIB04 candidate is older than the current version")
            if cur:
                cur.update(is_current=False, status="superseded")
            row.update(is_current=True, status="published", published_at=_now(), decision_note=args.get("p_note"))
            return "published"
        if fn == "restore_dataset_version":
            if row["is_current"]:
                return "noop"
            if row["status"] != "superseded":
                raise SupabaseError("BIB04 only a previously published version can be restored")
            for v in versions:
                if v["source_id"] == row["source_id"] and v["is_current"]:
                    v.update(is_current=False, status="superseded")
            row.update(is_current=True, status="published")
            return "restored"
        raise SupabaseError(f"unknown rpc {fn}")

    # ── aides de test ──────────────────────────────────────────────────
    def current(self) -> dict | None:
        return next((v for v in self.t["dataset_versions"] if v["is_current"]), None)

    def version(self, provider_version: str) -> dict | None:
        return next((v for v in self.t["dataset_versions"] if v["provider_version"] == provider_version), None)

    def incidents(self, kind: str | None = None) -> list[dict]:
        return [i for i in self.t["ops_incidents"] if kind is None or i["kind"] == kind]
