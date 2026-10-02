#!/usr/bin/env python3
"""
ResQ Real-Data Ingestion Script
Validates and ingests authoritative hydro-met & geospatial observations into PostgreSQL or in-memory repository.
"""

import os
import sys
import json
from datetime import datetime

# Add backend directory to sys.path if not already present
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.repository import repo

# Validation Constants
VALID_DATA_STATUSES = {"REAL", "DERIVED", "SIMULATED"}
VALID_SOURCE_TYPES = {"GOVERNMENT", "OPEN_DATA", "OSM", "RESQ_ENGINE", "DEMO"}
LAT_MIN, LAT_MAX = 11.0, 19.0  # Plausible Karnataka Latitude Bounds
LNG_MIN, LNG_MAX = 73.5, 79.0  # Plausible Karnataka Longitude Bounds


def validate_observation(obs: dict) -> tuple[bool, str]:
    """Validate a single observation record against ResQ real-data quality rules."""
    if not isinstance(obs, dict):
        return False, "Record must be a dictionary object"

    # Required fields
    required_fields = [
        "id", "station_name", "district", "parameter_name", "parameter_value",
        "source_name", "source_url", "source_dataset", "source_type", "data_status"
    ]
    for field in required_fields:
        if obs.get(field) is None or str(obs.get(field)).strip() == "":
            return False, f"Missing required field: '{field}'"

    # Data Status validation
    data_status = str(obs.get("data_status")).upper()
    if data_status not in VALID_DATA_STATUSES:
        return False, f"Invalid data_status '{data_status}'. Must be one of {VALID_DATA_STATUSES}"

    # Source Type validation
    source_type = str(obs.get("source_type")).upper()
    if source_type not in VALID_SOURCE_TYPES:
        return False, f"Invalid source_type '{source_type}'. Must be one of {VALID_SOURCE_TYPES}"

    # Geographic coordinates validation
    try:
        lat = float(obs["lat"])
        lng = float(obs["lng"])
        if not (LAT_MIN <= lat <= LAT_MAX):
            return False, f"Latitude {lat} is outside plausible Karnataka range [{LAT_MIN}, {LAT_MAX}]"
        if not (LNG_MIN <= lng <= LNG_MAX):
            return False, f"Longitude {lng} is outside plausible Karnataka range [{LNG_MIN}, {LNG_MAX}]"
    except (ValueError, TypeError, KeyError):
        return False, "Invalid or missing lat/lng coordinates"

    # Numeric value validation
    try:
        param_value = float(obs["parameter_value"])
    except (ValueError, TypeError):
        return False, f"parameter_value '{obs.get('parameter_value')}' must be a valid float"

    # Negative rainfall check
    param_name = str(obs.get("parameter_name")).upper()
    if "RAINFALL" in param_name and param_value < 0:
        return False, f"Negative rainfall value ({param_value}) is invalid"

    # Timestamp validation if present
    obs_time = obs.get("observation_time")
    if obs_time:
        try:
            # Replace Z with +00:00 for ISO parsing compatibility
            clean_time = str(obs_time).replace("Z", "+00:00")
            datetime.fromisoformat(clean_time)
        except Exception:
            return False, f"Invalid observation_time ISO format: '{obs_time}'"

    return True, "Valid"


def ingest_dataset(json_path: str = None, repository=None) -> dict:
    """Read, validate, and ingest the real observation dataset into the repository."""
    target_repo = repository or repo
    if not json_path:
        json_path = os.path.join(backend_dir, "data", "real_observations_karnataka.json")

    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Real dataset file not found at: {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    if not isinstance(records, list):
        raise ValueError("Dataset JSON must contain an array of observation objects.")

    successful = []
    failed = []

    for idx, record in enumerate(records):
        is_valid, reason = validate_observation(record)
        if is_valid:
            ingested = target_repo.upsert_observation(record)
            successful.append(ingested)
        else:
            failed.append({
                "index": idx,
                "id": record.get("id", "UNKNOWN"),
                "reason": reason
            })

    summary = {
        "total_records": len(records),
        "successful_ingested": len(successful),
        "failed_records": len(failed),
        "repository_mode": "POSTGRESQL" if not target_repo.in_memory else "IN-MEMORY",
        "failures": failed
    }

    return summary


def main():
    print("================================================================================")
    print("ResQ Real-Data Ingestion Pipeline")
    print("================================================================================")
    json_path = os.path.join(backend_dir, "data", "real_observations_karnataka.json")
    print(f"Reading dataset: {json_path}")

    summary = ingest_dataset(json_path)

    print("\nINGESTION SUMMARY REPORT:")
    print(f"• Target Storage Mode : {summary['repository_mode']}")
    print(f"• Total Records Read  : {summary['total_records']}")
    print(f"• Valid Records Saved : {summary['successful_ingested']}")
    print(f"• Failed Records      : {summary['failed_records']}")

    if summary["failures"]:
        print("\n❌ INGESTION FAILURES DETECTED:")
        for fail in summary["failures"]:
            print(f"  - Record #{fail['index']} (ID: {fail['id']}): {fail['reason']}")
    else:
        print("\n✅ ALL REAL OBSERVATIONS INGESTED SUCCESSFULLY WITH 0 FAILURES.")

    # Idempotency Verification Test
    print("\nVerifying Ingestion Idempotency (Re-running ingestion)...")
    summary2 = ingest_dataset(json_path)
    obs_count = len(repo.get_observations())
    print(f"• Re-ingestion Valid Saved : {summary2['successful_ingested']}")
    print(f"• Total Observations in Repo: {obs_count}")

    if obs_count == summary["successful_ingested"]:
        print("✅ IDEMPOTENCY CONFIRMED: Duplicate primary keys updated existing records cleanly.")
    else:
        print("❌ WARNING: Repository count increased after re-ingestion.")

    print("================================================================================")


if __name__ == "__main__":
    main()
