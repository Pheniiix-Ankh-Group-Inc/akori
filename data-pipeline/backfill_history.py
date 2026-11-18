"""Import exact historical State of BIB snapshots without changing the current published version.

Preview is the default. --apply writes to Supabase and requires SOB_SUPABASE_SYNC=true
and a privileged server key. Run only after reviewing the preview and backing up the DB.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

from paths import DATA_DIR, HISTORY_DIR
from validate import REQUIRED, validate_output_dir


def snapshot_versions(history: Path = HISTORY_DIR, current: Path = DATA_DIR):
    """Discover every version without trusting directory names or altering snapshots."""
    candidates = sorted(p for p in history.iterdir() if p.is_dir()) if history.exists() else []
    if current.is_dir():
        candidates.append(current)
    seen: dict[str, Path] = {}
    for folder in candidates:
        metadata = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
        version = metadata["dataset_version"]
        missing = [name for name in REQUIRED if not (folder / name).is_file()]
        if missing:
            raise ValueError(f"{folder}: missing {', '.join(missing)}")
        if version in seen:
            previous = seen[version]
            for name in REQUIRED:
                if hashlib.sha256((previous / name).read_bytes()).digest() != hashlib.sha256((folder / name).read_bytes()).digest():
                    raise ValueError(f"Version {version} has different contents in {previous} and {folder}")
            continue
        seen[version] = folder
    return [(version, folder) for version, folder in sorted(seen.items())]


def validate_archive(folder: Path) -> dict:
    errors = validate_output_dir(folder)
    if errors:
        raise ValueError(f"{folder}: technical validation failed: {errors}")
    return {name: hashlib.sha256((folder / name).read_bytes()).hexdigest() for name in REQUIRED}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Explicitly write historical versions to Supabase")
    args = parser.parse_args(argv)
    snapshots = snapshot_versions()
    for version, folder in snapshots:
        hashes = validate_archive(folder)
        print(f"{version}: {folder} ({len(hashes)} verified JSON artifacts)")
    print(f"Discovered {len(snapshots)} distinct historical version(s).")
    if not args.apply:
        print("PREVIEW ONLY. Use --apply after reviewing the output and backup.")
        return 0
    if os.environ.get("SOB_SUPABASE_SYNC") != "true":
        raise SystemExit("SOB_SUPABASE_SYNC=true is required for writes")
    from supabase_rest import SupabaseRest
    from publish_supabase import ingest
    sb = SupabaseRest()
    for version, folder in snapshots:
        if ingest(sb, folder, historical=True) != 0:
            print(f"Archive import failed at {version}; other versions remain untouched.")
            return 1
    print("All available historical snapshots imported. Current version pointer unchanged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
