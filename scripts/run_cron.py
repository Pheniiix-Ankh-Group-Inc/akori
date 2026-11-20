#!/usr/bin/env python3
"""Authenticated BIB cron HTTP client. Never follow redirects or accept a false success.

Invoked by GitHub Actions with SITE_URL and CRON_SECRET from the matching
environment. All network requests are HTTPS POSTs to a fixed relative path.
The response must explicitly confirm the intended application operation.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class CronFailure(ValueError):
    pass


def endpoint(base_url: str, kind: str, step: str | None = None) -> str:
    parts = urlsplit(base_url)
    if (parts.scheme != "https" or not parts.hostname or parts.username or parts.password
            or parts.query or parts.fragment or parts.path not in ("", "/")):
        raise CronFailure("SITE_URL must be an HTTPS origin, with no path/query/credentials")
    if kind == "news" and step is None:
        suffix = "/api/cron/news"
    elif kind == "newsletter" and step in ("generate", "check", "send"):
        suffix = "/api/cron/newsletter?step=" + step
    else:
        raise CronFailure("Invalid cron kind/step")
    return urlunsplit(("https", parts.netloc, suffix.split("?")[0],
                       suffix.split("?", 1)[1] if "?" in suffix else "", ""))


def verify(kind: str, step: str | None, code: int, payload: object) -> str:
    if code != 200:
        raise CronFailure(f"HTTP {code}: endpoint did not complete successfully")
    if not isinstance(payload, dict) or payload.get("ok") is not True:
        raise CronFailure("API response does not confirm ok=true")
    if kind == "news":
        if payload.get("skipped"):
            raise CronFailure(f"News ingestion disabled or skipped: {payload['skipped']}")
        report = payload.get("report")
        if not isinstance(report, dict):
            raise CronFailure("News response missing report")
        sources, fetched, inserted = (report.get(k) for k in ("sources", "fetched", "inserted"))
        if any(type(n) is not int or n < 0 for n in (sources, fetched, inserted)) or sources == 0:
            raise CronFailure("News has no authorized sources or invalid counters")
        failures = report.get("failures")
        if not isinstance(failures, list) or failures:
            raise CronFailure("One or more news sources failed")
        return f"News: {sources} sources, {fetched} fetched, {inserted} inserted"
    if kind != "newsletter" or step not in ("generate", "check", "send"):
        raise CronFailure("Invalid cron contract")
    result = payload.get("result")
    if not isinstance(result, dict) or result.get("step") != step:
        raise CronFailure("Newsletter response missing or mismatched step")
    status, detail = result.get("status"), result.get("detail", "")
    if status in ("blocked", "failed", "cancelled", "partially_sent"):
        raise CronFailure(f"Newsletter {step} is {status}")
    if step == "send" and detail == "créneau non atteint":
        return "Newsletter send: not due yet (explicit no-op)"
    allowed = {"generate": ("drafted", "eligible", "sent"),
               "check": ("eligible", "sent"),
               "send": ("sent",)}
    if status not in allowed[step]:
        raise CronFailure(f"Newsletter {step} not completed (status={status!r})")
    return f"Newsletter {step}: {status}"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", required=True, choices=("news", "newsletter"))
    parser.add_argument("--step", choices=("generate", "check", "send"))
    args = parser.parse_args(argv)
    try:
        url = endpoint(os.environ.get("SITE_URL", ""), args.kind, args.step)
        secret = os.environ.get("CRON_SECRET", "")
        if len(secret) < 32:
            raise CronFailure("Missing or invalid BIB_CRON_SECRET (minimum 32 chars)")
        request = Request(url, data=b"", method="POST",
                          headers={"Authorization": "Bearer " + secret,
                                   "Accept": "application/json"})
        opener = build_opener(NoRedirect())
        try:
            with opener.open(request, timeout=330 if args.kind == "newsletter" else 130) as response:
                code = response.status
                body = response.read(2_000_000)
        except HTTPError as response:
            code = response.code
            body = response.read(2_000_000)
        try:
            payload = json.loads(body)
        except (ValueError, UnicodeDecodeError):
            raise CronFailure(f"HTTP {code}: response was not JSON (redirect/error?)")
        message = verify(args.kind, args.step, code, payload)
        print(message)
        with open(os.environ.get("GITHUB_STEP_SUMMARY", "/dev/null"), "a", encoding="utf-8") as summary:
            summary.write(f"### BIB cron: {args.kind}\n\n{message}\n")
        return 0
    except (CronFailure, URLError, TimeoutError, OSError) as exc:
        print(f"::error title=BIB cron::{exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
