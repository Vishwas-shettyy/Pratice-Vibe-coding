#!/usr/bin/env python3
import urllib.request
import urllib.parse
import urllib.error
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.repository import Repository

KODAGU_LAT_MIN = 11.5
KODAGU_LAT_MAX = 13.0
KODAGU_LNG_MIN = 75.0
KODAGU_LNG_MAX = 76.5

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://z.overpass-api.de/api/interpreter"
]

OVERPASS_QUERY = """
[out:json][timeout:120];
area["name"="Kodagu"]["admin_level"="5"]->.searchArea;
(
  node["amenity"~"school|college|community_centre|hospital"](area.searchArea);
  way["amenity"~"school|college|community_centre|hospital"](area.searchArea);
  relation["amenity"~"school|college|community_centre|hospital"](area.searchArea);
);
out center;
"""

def map_facility_type(amenity):
    mapping = {
        "school": "SCHOOL",
        "college": "COLLEGE",
        "community_centre": "COMMUNITY_CENTRE",
        "hospital": "HOSPITAL"
    }
    return mapping.get(amenity)

def validate_facility(elem):
    if not isinstance(elem, dict):
        return False, "Not a dictionary"
        
    elem_id = elem.get("id")
    elem_type = elem.get("type")
    if not elem_id or not elem_type:
        return False, "Missing OSM identity"
        
    tags = elem.get("tags", {})
    amenity = tags.get("amenity")
    if not amenity:
        return False, "Missing amenity tag"
        
    lat = elem.get("lat") or (elem.get("center", {}).get("lat"))
    lon = elem.get("lon") or (elem.get("center", {}).get("lon"))
    
    if lat is None or lon is None:
        return False, "Missing coordinates"
        
    if not (KODAGU_LAT_MIN <= lat <= KODAGU_LAT_MAX and KODAGU_LNG_MIN <= lon <= KODAGU_LNG_MAX):
        return False, f"Coordinates ({lat}, {lon}) fall outside Kodagu boundary limits"
        
    return True, ""

def ingest_osm_facilities(repo=None, force_download: bool = False):
    if repo is None:
        repo = Repository()
        
    data_dir = backend_dir / "data"
    data_dir.mkdir(exist_ok=True)
    cache_file = data_dir / "kodagu_osm_facilities_raw.json"
    
    osm_data = None
    success = False

    if not force_download and cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                osm_data = json.load(f)
            success = True
            print(f"✅ Loaded cached OSM facilities from {cache_file}")
        except Exception as e:
            print(f"⚠️ Failed reading cached facilities: {e}")

    if not success:
        print("🌍 Fetching REAL OSM facilities data from Overpass API (this may take a minute)...")
        data = urllib.parse.urlencode({'data': OVERPASS_QUERY}).encode('utf-8')
        headers = {
            'User-Agent': 'ResQ-Kodagu-Facilities-Ingestion/2.0',
            'Accept': '*/*'
        }
        
        for endpoint in ENDPOINTS:
            print(f"Trying endpoint: {endpoint}")
            req = urllib.request.Request(endpoint, data=data, headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=120) as response:
                    content = response.read()
                    osm_data = json.loads(content.decode('utf-8'))
                    with open(cache_file, "w") as f:
                        json.dump(osm_data, f, indent=2)
                    print(f"✅ Successfully downloaded OSM data from {endpoint}")
                    success = True
                    break
            except urllib.error.URLError as e:
                print(f"⚠️ Endpoint failed: {e}")
            except json.JSONDecodeError as e:
                print(f"⚠️ Invalid JSON response from endpoint: {e}")
                
        if not success:
            print("❌ All Overpass endpoints failed. Aborting ingestion to prevent silent fallback.")
            sys.exit(1)

    elements = osm_data.get("elements", [])
    
    stats = {
        "total": len(elements),
        "ingested": 0,
        "rejected": 0,
        "types": {"SCHOOL": 0, "COLLEGE": 0, "COMMUNITY_CENTRE": 0, "HOSPITAL": 0, "UNKNOWN": 0},
        "named": 0,
        "unnamed": 0,
        "with_coords": 0,
        "without_coords": 0,
        "rejection_reasons": {}
    }
    
    current_time = datetime.now(timezone.utc).isoformat()
    
    for elem in elements:
        lat = elem.get("lat") or (elem.get("center", {}).get("lat"))
        if lat is not None:
            stats["with_coords"] += 1
        else:
            stats["without_coords"] += 1
            
        is_valid, reason = validate_facility(elem)
        if not is_valid:
            stats["rejected"] += 1
            stats["rejection_reasons"][reason] = stats["rejection_reasons"].get(reason, 0) + 1
            continue
            
        tags = elem.get("tags", {})
        elem_id = elem["id"]
        elem_type = elem["type"]
        
        amenity = tags.get("amenity")
        f_type = map_facility_type(amenity)
        if f_type:
            stats["types"][f_type] += 1
        else:
            stats["types"]["UNKNOWN"] += 1
            f_type = "UNKNOWN"
            
        name = tags.get("name")
        if name:
            stats["named"] += 1
        else:
            stats["unnamed"] += 1
            
        record = {
            "id": f"osm_facility_{elem_type}_{elem_id}",
            "osm_element_id": f"{elem_type}/{elem_id}",
            "name": name,
            "district": "Kodagu",
            "taluk": None,
            "lat": elem.get("lat") or elem.get("center", {}).get("lat"),
            "lng": elem.get("lon") or elem.get("center", {}).get("lon"),
            "facility_type": f_type,
            "source_name": "OpenStreetMap",
            "source_url": f"https://www.openstreetmap.org/{elem_type}/{elem_id}",
            "source_dataset": "Overpass Facilities Extract",
            "source_type": "OPEN_GEO",
            "data_status": "REAL",
            "observation_time": current_time
        }
        
        repo.upsert_facility(record)
        stats["ingested"] += 1

    print("\n--- OSM FACILITIES INGESTION SUMMARY ---")
    print(f"Extraction Timestamp: {current_time}")
    print(f"Total elements extracted: {stats['total']}")
    print(f"Successfully ingested: {stats['ingested']}")
    print(f"Rejected: {stats['rejected']}")
    if stats["rejected"] > 0:
        print("Rejection reasons:")
        for r, count in stats["rejection_reasons"].items():
            print(f"  - {r}: {count}")
    print("\nData Quality:")
    print(f"Schools: {stats['types']['SCHOOL']}")
    print(f"Colleges: {stats['types']['COLLEGE']}")
    print(f"Community Centres: {stats['types']['COMMUNITY_CENTRE']}")
    print(f"Hospitals: {stats['types']['HOSPITAL']}")
    print(f"Named: {stats['named']} | Unnamed: {stats['unnamed']}")
    print(f"With Coordinates: {stats['with_coords']} | Without: {stats['without_coords']}")
    
    return stats

if __name__ == "__main__":
    ingest_osm_facilities()
