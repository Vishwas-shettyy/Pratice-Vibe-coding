#!/usr/bin/env python3
"""
Ingestion Script for Real Kodagu Settlement Dataset.

Validates and idempotently ingests verified, source-attributed Kodagu settlement records
into the ResQ Repository architecture without overwriting demonstration records.
"""

import json
import sys
from pathlib import Path

# Add parent directory to sys.path to allow importing backend modules
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.repository import Repository

# Kodagu geographic boundary constraints
KODAGU_LAT_MIN = 11.5
KODAGU_LAT_MAX = 13.0
KODAGU_LNG_MIN = 75.0
KODAGU_LNG_MAX = 76.5

REQUIRED_FIELDS = [
    "id",
    "code",
    "name",
    "district",
    "taluk",
    "lat",
    "lng",
    "source_name",
    "source_url",
    "source_dataset",
    "source_type",
    "data_status",
]

VALID_SOURCE_TYPES = {"CENSUS", "GOVERNMENT", "OSM", "KSDMA"}


def validate_settlement_record(record: dict) -> tuple[bool, str]:
    """
    Validates a settlement record against strict quality and provenance criteria.

    Returns (is_valid, error_reason).
    """
    if not isinstance(record, dict):
        return False, "Record must be a dictionary"

    # 1. Required fields check
    for field in REQUIRED_FIELDS:
        val = record.get(field)
        if val is None or (isinstance(val, str) and not val.strip()):
            return False, f"Missing or empty required field: '{field}'"

    # 2. District validation
    if record["district"].strip().lower() != "kodagu":
        return False, f"Invalid district '{record.get('district')}'; MUST be 'Kodagu'"

    # 3. Settlement verification (name and taluk must be valid non-empty strings)
    if not str(record.get("name")).strip():
        return False, "Settlement name cannot be empty"
    if not str(record.get("taluk")).strip():
        return False, "Settlement taluk cannot be empty"

    # 4. Coordinate validation
    try:
        lat = float(record["lat"])
        lng = float(record["lng"])
    except (ValueError, TypeError):
        return False, f"Malformed coordinates: lat={record.get('lat')}, lng={record.get('lng')}"

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        return False, f"Coordinates out of global bounds: ({lat}, {lng})"

    if not (KODAGU_LAT_MIN <= lat <= KODAGU_LAT_MAX and KODAGU_LNG_MIN <= lng <= KODAGU_LNG_MAX):
        return False, f"Coordinates ({lat}, {lng}) fall outside Kodagu boundary limits"

    # 5. Provenance validation
    data_status = str(record.get("data_status")).strip().upper()
    if data_status != "REAL":
        return False, f"Invalid data_status '{data_status}'; MUST be 'REAL'"

    source_type = str(record.get("source_type")).strip().upper()
    if source_type not in VALID_SOURCE_TYPES:
        return False, f"Invalid source_type '{source_type}'; MUST be one of {VALID_SOURCE_TYPES}"

    source_name = str(record.get("source_name")).strip()
    source_url = str(record.get("source_url")).strip()
    source_dataset = str(record.get("source_dataset")).strip()

    if not source_name or not source_url or not source_dataset:
        return False, "Incomplete source provenance (source_name, source_url, and source_dataset required)"

    # 6. Population validation (if present, must be non-negative int; or None/null)
    pop = record.get("population")
    if pop is not None:
        if not isinstance(pop, int) or pop < 0:
            return False, f"Invalid population value: {pop}; MUST be a non-negative integer or null"

    return True, ""


def ingest_kodagu_settlements(
    json_path: Path = None, repo: Repository = None
) -> dict:
    """
    Reads, validates, and ingests Kodagu settlement records idempotently.
    """
    if json_path is None:
        json_path = backend_dir / "data" / "kodagu_settlements.json"

    if not json_path.exists():
        raise FileNotFoundError(f"Dataset file not found at: {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    if repo is None:
        repo = Repository()

    ingested_count = 0
    rejected_count = 0
    rejected_details = []

    for idx, rec in enumerate(records):
        is_valid, reason = validate_settlement_record(rec)
        if not is_valid:
            rejected_count += 1
            rejected_details.append({"index": idx, "id": rec.get("id"), "reason": reason})
            print(f"❌ Rejected record #{idx} ({rec.get('id', 'UNKNOWN')}): {reason}")
            continue

        # Ingest record idempotently via repository
        repo.upsert_habitation(rec)
        ingested_count += 1
        print(f"✅ Ingested settlement: {rec['id']} - {rec['name']} ({rec['taluk']} Taluk)")

    summary = {
        "total_records": len(records),
        "ingested_records": ingested_count,
        "rejected_records": rejected_count,
        "rejected_details": rejected_details,
    }

    print("\n--- INGESTION SUMMARY ---")
    print(f"Total read: {summary['total_records']}")
    print(f"Successfully ingested: {summary['ingested_records']}")
    print(f"Rejected: {summary['rejected_records']}")

    return summary


if __name__ == "__main__":
    try:
        summary = ingest_kodagu_settlements()
        if summary["rejected_records"] > 0:
            print("\n⚠️ Ingestion completed with rejections.")
            sys.exit(1)
        else:
            print("\n🎉 All Kodagu settlement records successfully ingested.")
            sys.exit(0)
    except Exception as e:
        print(f"❌ Ingestion failed with error: {e}")
        sys.exit(1)
