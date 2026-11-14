"""supabase_rest.py — accès minimal à Supabase (PostgREST + Storage) pour le pipeline.

Utilise la clé secrète du projet Supabase BIB, lue dans l'environnement :
    SUPABASE_URL, SUPABASE_SECRET_KEY
La clé n'est jamais affichée. À n'utiliser que depuis un environnement de
confiance (GitHub Actions avec secrets, poste d'un opérateur).
"""

from __future__ import annotations

import os
from typing import Any

import requests


class SupabaseError(RuntimeError):
    pass


class SupabaseRest:
    def __init__(self, url: str | None = None, key: str | None = None, timeout: int = 60):
        self.url = (url or os.environ.get("SUPABASE_URL", "")).rstrip("/")
        key = key or os.environ.get("SUPABASE_SECRET_KEY", "")
        if not self.url or not key:
            raise SupabaseError("SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.")
        # Les clés secrètes Supabase (sb_secret_…) sont opaques, pas des JWT :
        # elles se transmettent uniquement dans l'en-tête « apikey ».
        # https://supabase.com/docs/guides/getting-started/api-keys
        self._headers = {"apikey": key}
        self.timeout = timeout

    # ── PostgREST ──────────────────────────────────────────────────────
    def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        r = requests.get(f"{self.url}/rest/v1/{table}", headers=self._headers, params=params, timeout=self.timeout)
        self._raise(r, f"select {table}")
        return r.json()

    def insert(self, table: str, rows: list[dict[str, Any]] | dict[str, Any], *, on_conflict: str | None = None,
               ignore_duplicates: bool = False, returning: bool = True) -> list[dict[str, Any]]:
        prefer = ["return=representation" if returning else "return=minimal"]
        params = {}
        if on_conflict:
            params["on_conflict"] = on_conflict
            prefer.append("resolution=ignore-duplicates" if ignore_duplicates else "resolution=merge-duplicates")
        r = requests.post(
            f"{self.url}/rest/v1/{table}",
            headers={**self._headers, "Content-Type": "application/json", "Prefer": ",".join(prefer)},
            params=params,
            json=rows,
            timeout=self.timeout,
        )
        self._raise(r, f"insert {table}")
        return r.json() if returning and r.content else []

    def update(self, table: str, match: dict[str, str], values: dict[str, Any]) -> None:
        r = requests.patch(
            f"{self.url}/rest/v1/{table}",
            headers={**self._headers, "Content-Type": "application/json", "Prefer": "return=minimal"},
            params=match,
            json=values,
            timeout=self.timeout,
        )
        self._raise(r, f"update {table}")

    def rpc(self, fn: str, args: dict[str, Any]) -> Any:
        r = requests.post(
            f"{self.url}/rest/v1/rpc/{fn}",
            headers={**self._headers, "Content-Type": "application/json"},
            json=args,
            timeout=self.timeout,
        )
        self._raise(r, f"rpc {fn}")
        return r.json() if r.content else None

    # ── Storage ────────────────────────────────────────────────────────
    def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> bool:
        """Envoie un objet. Renvoie False s'il existe déjà (snapshots immuables)."""
        r = requests.post(
            f"{self.url}/storage/v1/object/{bucket}/{path}",
            headers={**self._headers, "Content-Type": content_type, "x-upsert": "false"},
            data=content,
            timeout=self.timeout,
        )
        if r.status_code in (400, 409) and "exists" in r.text.lower():
            return False
        self._raise(r, f"upload {bucket}/{path}")
        return True

    @staticmethod
    def _raise(r: requests.Response, what: str) -> None:
        if r.status_code >= 400:
            # Pas de corps complet : il pourrait contenir des données inutiles.
            raise SupabaseError(f"{what} → HTTP {r.status_code}: {r.text[:300]}")
