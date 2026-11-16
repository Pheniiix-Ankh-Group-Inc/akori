"""Emplacements des données internes State of BIB (hors de public/, non servies)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "state-of-bib" / "current"
HISTORY_DIR = ROOT / "data" / "state-of-bib" / "history"
