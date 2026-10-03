#!/usr/bin/env python3
"""
Ingestion Script for Real OpenStreetMap Road Network Dataset.

Fetches Kodagu road networks from the Overpass API, validates the records,
and idempotently ingests them into the ResQ Repository architecture.
"""

import json
import sys
import datetime
from pathlib import Path
import urllib.request
import urllib.parse
import urllib.error

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

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_QUERY = """
[out:json][timeout:60];
area["name"="Kodagu"]["admin_level"="5"]->.searchArea;
(
  way["highway"]["highway"!~"path|footway|pedestrian|steps|track"](area.searchArea);
);
out geom;
"""

def download_osm_data(output_path: Path):
    print(f"🌍 Fetching OSM road data from Overpass API (this may take a minute)...")
    data = urllib.parse.urlencode({'data': OVERPASS_QUERY}).encode('utf-8')
    headers = {
        'User-Agent': 'ResQ-Kodagu-Data-Ingestion/1.0',
        'Accept': '*/*'
    }
    req = urllib.request.Request(OVERPASS_URL, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            content = response.read()
            with open(output_path, "wb") as f:
                f.write(content)
            print(f"✅ Downloaded OSM data to {output_path}")
    except urllib.error.URLError as e:
        print(f"❌ Failed to fetch from Overpass API: {e}")
        sys.exit(1)

def validate_road_record(record: dict) -> tuple[bool, str]:
    """Validates an ingested road record against strict criteria."""
    
    # Required fields check
    if not record.get("id"):
        return False, "Missing 'id'"
    if not record.get("highway_class"):
        return False, "Missing 'highway_class'"
    if not record.get("geometry") or record["geometry"].get("type") != "LineString":
        return False, "Missing or invalid 'geometry' (must be LineString)"
    
    coords = record["geometry"].get("coordinates", [])
    if len(coords) < 2:
        return False, "Geometry must have at least 2 coordinates"
    
    # Boundary check on every coordinate
    for idx, (lon, lat) in enumerate(coords):
        if not (KODAGU_LAT_MIN <= lat <= KODAGU_LAT_MAX and KODAGU_LNG_MIN <= lon <= KODAGU_LNG_MAX):
            return False, f"Coordinate at index {idx} ({lat}, {lon}) falls outside Kodagu boundary limits"
    
    if record.get("source_name") != "OpenStreetMap":
        return False, "source_name MUST be OpenStreetMap"
    
    if record.get("source_type") != "OPEN_GEO":
        return False, "source_type MUST be OPEN_GEO"
    
    if record.get("data_status") != "REAL":
        return False, "data_status MUST be REAL"
        
    return True, ""

def ingest_osm_roads(
    repo: Repository = None, force_download: bool = False
) -> dict:
    """Reads, validates, and ingests Kodagu road records idempotently."""
    
    data_dir = backend_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    json_path = data_dir / "kodagu_osm_roads_raw.json"
    
    if force_download or not json_path.exists():
        download_osm_data(json_path)

    with open(json_path, "r", encoding="utf-8") as f:
        osm_data = json.load(f)

    if repo is None:
        repo = Repository()

    elements = osm_data.get("elements", [])
    ingested_count = 0
    rejected_count = 0
    
    current_time = datetime.datetime.now(datetime.timezone.utc).isoformat()

    print(f"🔍 Processing {len(elements)} elements from OSM dataset...")
    
    valid_records = []
    for idx, el in enumerate(elements):
        if el.get("type") != "way":
            continue
            
        way_id = el.get("id")
        tags = el.get("tags", {})
        geom = el.get("geometry", [])
        
        if not geom:
            continue
            
        coordinates = [[pt["lon"], pt["lat"]] for pt in geom]
        
        road_record = {
            "id": f"osm_way_{way_id}",
            "name": tags.get("name"),
            "highway_class": tags.get("highway"),
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates
            },
            "surface": tags.get("surface"),
            "bridge": tags.get("bridge") == "yes",
            "is_oneway": tags.get("oneway") == "yes",
            "access": tags.get("access"),
            "maxspeed": tags.get("maxspeed"),
            "source_name": "OpenStreetMap",
            "source_url": f"https://www.openstreetmap.org/way/{way_id}",
            "source_dataset": "Overpass API Kodagu Extract",
            "source_type": "OPEN_GEO",
            "data_status": "REAL",
            "observation_time": current_time
        }
        
        is_valid, reason = validate_road_record(road_record)
        if not is_valid:
            rejected_count += 1
            # print(f"❌ Rejected road {road_record['id']}: {reason}")
            continue

        valid_records.append(road_record)

    if hasattr(repo, "upsert_roads"):
        repo.upsert_roads(valid_records)
    elif hasattr(repo, "upsert_roads_batch"):
        repo.upsert_roads_batch(valid_records)
    else:
        for r in valid_records:
            repo.upsert_road(r)
    ingested_count = len(valid_records)

    summary = {
        "total_ways": len(elements),
        "ingested_records": ingested_count,
        "rejected_records": rejected_count
    }

    print("\n--- OSM ROAD INGESTION SUMMARY ---")
    print(f"Total OSM elements processed: {summary['total_ways']}")
    print(f"Successfully ingested roads: {summary['ingested_records']}")
    print(f"Rejected or skipped: {summary['rejected_records']}")

    return summary


if __name__ == "__main__":
    force = "--force" in sys.argv
    try:
        summary = ingest_osm_roads(force_download=force)
        if summary["ingested_records"] == 0:
            print("\n⚠️ Ingestion completed but no roads were ingested.")
            sys.exit(1)
        else:
            print("\n🎉 All Kodagu road records successfully ingested.")
            sys.exit(0)
    except Exception as e:
        print(f"❌ Ingestion failed with error: {e}")
        sys.exit(1)
