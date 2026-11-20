#!/usr/bin/env python3
"""Public SSR smoke test for the canonical State of BIB pages.

Run after private database/Storage verification. HTTP 200 alone is not enough:
the rendered report must contain the current version and numeric KPI values.
No keys or authorization headers are used in these public GET requests.
"""
from __future__ import annotations
import argparse
import html
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import urlopen


class PublicSobFailure(ValueError):
    pass


def canonical(site_url: str) -> str:
    u = urlsplit(site_url)
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.query or u.fragment or u.path not in ("", "/"):
        raise PublicSobFailure("site URL must be an HTTPS origin only")
    return urlunsplit(("https", u.netloc, "", "", "")).rstrip("/")


def visible_numbers(page: str, element_id: str) -> int:
    # Verify a real visible numeric statistic, not a version in a <script>.
    tag = re.search(r"<(?:h2|strong)\b[^>]*\bid=\"%s\"[^>]*>(.*?)</(?:h2|strong)>" % re.escape(element_id), page, re.S)
    if not tag:
        raise PublicSobFailure(f"missing visible KPI {element_id}")
    number = re.sub(r"[^\d]", "", html.unescape(re.sub(r"<[^>]*>", "", tag.group(1))))
    if not number or int(number) <= 0:
        raise PublicSobFailure(f"invalid or empty KPI {element_id}")
    return int(number)


def check_report(page: str, version: str) -> int:
    kpi = visible_numbers(page, "sob-headline")
    dl = re.search(r'<dl\s+class="sob-facts"[^>]*>(.*?)</dl>', page, re.S)
    values = re.findall(r"<dd[^>]*>(.*?)</dd>", dl.group(1), re.S) if dl else []
    displayed_version = html.unescape(re.sub(r"<[^>]*>", "", values[-1])).strip() if values else ""
    if displayed_version != version:
        raise PublicSobFailure(f"rendered version mismatch: expected {version}, got {displayed_version or 'none'}")
    return kpi


def check_home(page: str) -> None:
    section = re.search(r'<section\b[^>]*aria-labelledby="home-sob"[^>]*>(.*?)</section>', page, re.S)
    if not section or '<div class="ed-stats">' not in section.group(1):
        raise PublicSobFailure("homepage State of BIB statistics section missing")
    values = re.findall(r"<strong>(.*?)</strong>", section.group(1), re.S)
    if len(values) < 5 or any(not re.search(r"\d", html.unescape(v)) for v in values):
        raise PublicSobFailure("homepage State of BIB KPIs missing or empty")


def verify_public(base: str, version: str, attempts: int = 5, delay: int = 20) -> None:
    if not re.fullmatch(r"[0-9A-Za-z._-]{5,90}", version):
        raise PublicSobFailure("invalid expected dataset version")
    checks = [
        ("/state_of_bib", lambda s: check_report(s, version)),
        ("/fr/state_of_bib", lambda s: check_report(s, version)),
        ("/", check_home),
        ("/fr", check_home),
    ]
    for attempt in range(1, attempts + 1):
        try:
            for suffix, validator in checks:
                url = base + suffix
                with urlopen(url, timeout=30) as response:
                    if response.status != 200:
                        raise PublicSobFailure(f"{suffix}: HTTP {response.status}")
                    final_hostname = urlsplit(response.url).hostname
                    origin_hostname = urlsplit(base).hostname
                    if final_hostname not in (origin_hostname, "www." + (origin_hostname or "")):
                        raise PublicSobFailure("untrusted public redirect")
                    body = response.read(3_000_000).decode("utf-8")
                validator(body)
            print(f"Public State of BIB SSR verified, version {version}: EN/FR report and homepage")
            return
        except (HTTPError, URLError, TimeoutError, OSError, UnicodeDecodeError, PublicSobFailure) as exc:
            print(f"Public State of BIB check {attempt}/{attempts}: {exc}", file=sys.stderr)
            if attempt < attempts:
                time.sleep(delay)
    raise PublicSobFailure("published version not reliably visible on public pages")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-url", required=True)
    parser.add_argument("--version", required=True)
    args = parser.parse_args(argv)
    try:
        verify_public(canonical(args.site_url), args.version)
    except PublicSobFailure as exc:
        print(f"::error title=State of BIB public visibility::{exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
