"""
Unit tests for Real Kodagu Settlement Dataset Ingestion & Validation.
"""

import json
import os
import sys
import unittest
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.repository import Repository
from scripts.ingest_kodagu_settlements import (
    validate_settlement_record,
    ingest_kodagu_settlements,
)


class TestKodaguSettlementIngestion(unittest.TestCase):
    def setUp(self):
        self.repo = Repository(db_url=None)
        # Seed demo data
        demo_habs = [
            {
                "id": "HAB-101",
                "name": "Village A (Kaveri Basin)",
                "district": "Mysuru",
                "lat": 12.31,
                "lng": 76.62,
                "population": 680,
                "data_status": "DEMO",
            },
            {
                "id": "HAB-102",
                "name": "Village B (Mudhall Ridge)",
                "district": "Chamarajanagar",
                "lat": 12.28,
                "lng": 76.67,
                "population": 450,
                "data_status": "DEMO",
            },
        ]
        self.repo.seed_data(demo_habs, [], {})

    def test_valid_settlement_record(self):
        valid_rec = {
            "id": "SET-TEST-01",
            "code": "603204",
            "name": "Bhagamandala",
            "district": "Kodagu",
            "taluk": "Madikeri",
            "region": "Upper Kaveri Basin",
            "region_type": "RESQ_DERIVED",
            "lat": 12.3908,
            "lng": 75.5348,
            "population": 2154,
            "source_name": "Census of India 2011",
            "source_url": "https://censusindia.gov.in",
            "source_dataset": "District Census Handbook - Kodagu",
            "source_type": "CENSUS",
            "coordinate_source_name": "OpenStreetMap & ISRO Bhuvan",
            "coordinate_source_url": "https://www.openstreetmap.org",
            "coordinate_source_dataset": "OSM / Bhuvan Settlement Gazetteer",
            "coordinate_source_type": "OSM",
            "data_status": "REAL",
        }
        is_valid, reason = validate_settlement_record(valid_rec)
        self.assertTrue(is_valid, f"Validation failed unexpectedly: {reason}")

    def test_district_validation(self):
        bad_district_rec = {
            "id": "SET-TEST-02",
            "code": "603204",
            "name": "Bhagamandala",
            "district": "Mysuru",  # Not Kodagu
            "taluk": "Madikeri",
            "lat": 12.3908,
            "lng": 75.5348,
            "population": 2154,
            "source_name": "Census of India 2011",
            "source_url": "https://censusindia.gov.in",
            "source_dataset": "District Census Handbook - Kodagu",
            "source_type": "CENSUS",
            "coordinate_source_name": "OpenStreetMap & ISRO Bhuvan",
            "coordinate_source_url": "https://www.openstreetmap.org",
            "coordinate_source_dataset": "OSM / Bhuvan Settlement Gazetteer",
            "coordinate_source_type": "OSM",
            "data_status": "REAL",
        }
        is_valid, reason = validate_settlement_record(bad_district_rec)
        self.assertFalse(is_valid)
        self.assertIn("MUST be 'Kodagu'", reason)

    def test_coordinate_validation(self):
        # Lat out of Kodagu bounds
        bad_lat_rec = {
            "id": "SET-TEST-03",
            "code": "603204",
            "name": "Out of Bounds Village",
            "district": "Kodagu",
            "taluk": "Madikeri",
            "lat": 15.3908,  # Too far north
            "lng": 75.5348,
            "population": 500,
            "source_name": "Census of India 2011",
            "source_url": "https://censusindia.gov.in",
            "source_dataset": "District Census Handbook",
            "source_type": "CENSUS",
            "coordinate_source_name": "OpenStreetMap & ISRO Bhuvan",
            "coordinate_source_url": "https://www.openstreetmap.org",
            "coordinate_source_dataset": "OSM / Bhuvan Settlement Gazetteer",
            "coordinate_source_type": "OSM",
            "data_status": "REAL",
        }
        is_valid, reason = validate_settlement_record(bad_lat_rec)
        self.assertFalse(is_valid)
        self.assertIn("outside Kodagu boundary limits", reason)

        # Malformed non-numeric coordinates
        malformed_coord_rec = dict(bad_lat_rec, lat="INVALID_LAT")
        is_valid, reason = validate_settlement_record(malformed_coord_rec)
        self.assertFalse(is_valid)
        self.assertIn("Malformed coordinates", reason)

    def test_provenance_validation(self):
        # Missing source_url
        no_url_rec = {
            "id": "SET-TEST-04",
            "code": "603204",
            "name": "Bhagamandala",
            "district": "Kodagu",
            "taluk": "Madikeri",
            "lat": 12.3908,
            "lng": 75.5348,
            "population": 2154,
            "source_name": "Census of India 2011",
            "source_url": "",  # Empty URL
            "source_dataset": "District Census Handbook",
            "source_type": "CENSUS",
            "coordinate_source_name": "OpenStreetMap & ISRO Bhuvan",
            "coordinate_source_url": "https://www.openstreetmap.org",
            "coordinate_source_dataset": "OSM / Bhuvan Settlement Gazetteer",
            "coordinate_source_type": "OSM",
            "data_status": "REAL",
        }
        is_valid, reason = validate_settlement_record(no_url_rec)
        self.assertFalse(is_valid)
        self.assertIn("Missing or empty required field: 'source_url'", reason)

        # Invalid data_status (DEMO instead of REAL)
        demo_status_rec = dict(no_url_rec, source_url="https://example.com", data_status="DEMO")
        is_valid, reason = validate_settlement_record(demo_status_rec)
        self.assertFalse(is_valid)
        self.assertIn("MUST be 'REAL'", reason)

    def test_coordinate_provenance_validation(self):
        # Incorrectly claiming Census as coordinate_source_type for WGS84 decimal point coordinates
        false_census_coord_rec = {
            "id": "SET-TEST-05",
            "code": "603204",
            "name": "Bhagamandala",
            "district": "Kodagu",
            "taluk": "Madikeri",
            "lat": 12.3908,
            "lng": 75.5348,
            "population": 2154,
            "source_name": "Census of India 2011",
            "source_url": "https://censusindia.gov.in",
            "source_dataset": "District Census Handbook",
            "source_type": "CENSUS",
            "coordinate_source_name": "Census of India 2011",
            "coordinate_source_url": "https://censusindia.gov.in",
            "coordinate_source_dataset": "District Census Handbook",
            "coordinate_source_type": "CENSUS",  # False claim: Census does not publish decimal GPS point coords
            "data_status": "REAL",
        }
        is_valid, reason = validate_settlement_record(false_census_coord_rec)
        self.assertFalse(is_valid)
        self.assertIn("Census cannot be claimed as coordinate_source_type", reason)

    def test_missing_population_handling(self):
        # Record with null/None population (e.g. Kottai Settlement)
        null_pop_rec = {
            "id": "SET-KOD-VIR-05",
            "code": "603268",
            "name": "Kottai Settlement",
            "district": "Kodagu",
            "taluk": "Virajpet",
            "lat": 12.1245,
            "lng": 75.8210,
            "population": None,
            "source_name": "OpenStreetMap & KSDMA Survey",
            "source_url": "https://www.openstreetmap.org",
            "source_dataset": "OSM Settlement Node Survey",
            "source_type": "OSM",
            "coordinate_source_name": "OpenStreetMap & KSDMA Survey",
            "coordinate_source_url": "https://www.openstreetmap.org",
            "coordinate_source_dataset": "OSM Settlement Node Survey",
            "coordinate_source_type": "OSM",
            "data_status": "REAL",
        }
        is_valid, reason = validate_settlement_record(null_pop_rec)
        self.assertTrue(is_valid, f"Validation failed for null population record: {reason}")

        # Ingest into repo and check population is None
        self.repo.upsert_habitation(null_pop_rec)
        habs = {h["id"]: h for h in self.repo.get_all_habitations()}
        self.assertIn("SET-KOD-VIR-05", habs)
        self.assertIsNone(habs["SET-KOD-VIR-05"]["population"])

    def test_idempotent_ingestion(self):
        json_path = backend_dir / "data" / "kodagu_settlements.json"
        
        # First ingestion run
        summary1 = ingest_kodagu_settlements(json_path=json_path, repo=self.repo)
        self.assertEqual(summary1["ingested_records"], 16)
        self.assertEqual(summary1["rejected_records"], 0)

        hab_count_after_first = len(self.repo.get_all_habitations())

        # Second ingestion run (idempotent upsert)
        summary2 = ingest_kodagu_settlements(json_path=json_path, repo=self.repo)
        self.assertEqual(summary2["ingested_records"], 16)
        self.assertEqual(summary2["rejected_records"], 0)

        hab_count_after_second = len(self.repo.get_all_habitations())

        # Total habitations count should not change on re-ingestion
        self.assertEqual(hab_count_after_first, hab_count_after_second)

    def test_demonstration_records_remain_intact(self):
        json_path = backend_dir / "data" / "kodagu_settlements.json"
        ingest_kodagu_settlements(json_path=json_path, repo=self.repo)

        habs = {h["id"]: h for h in self.repo.get_all_habitations()}

        # Verify demo records HAB-101 and HAB-102 exist and were untouched
        self.assertIn("HAB-101", habs)
        self.assertIn("HAB-102", habs)
        self.assertEqual(habs["HAB-101"]["name"], "Village A (Kaveri Basin)")
        self.assertEqual(habs["HAB-101"]["data_status"], "DEMO")

    def test_real_settlement_records_distinguishable_from_demo(self):
        json_path = backend_dir / "data" / "kodagu_settlements.json"
        ingest_kodagu_settlements(json_path=json_path, repo=self.repo)

        habs = self.repo.get_all_habitations()
        real_habs = [h for h in habs if h.get("data_status") == "REAL"]
        demo_habs = [h for h in habs if h.get("data_status") == "DEMO"]

        self.assertEqual(len(real_habs), 16)
        self.assertEqual(len(demo_habs), 2)

        for rh in real_habs:
            self.assertEqual(rh["district"], "Kodagu")
            self.assertIsNotNone(rh.get("source_name"))
            self.assertIsNotNone(rh.get("source_url"))
            self.assertIsNotNone(rh.get("source_dataset"))
            self.assertIsNotNone(rh.get("coordinate_source_name"))
            self.assertIsNotNone(rh.get("coordinate_source_url"))
            self.assertIsNotNone(rh.get("coordinate_source_dataset"))
            self.assertIsNotNone(rh.get("coordinate_source_type"))
            self.assertEqual(rh.get("region_type"), "RESQ_DERIVED")

            # Records 1-15 (Census source) must have OSM/GIS coordinate source type
            if rh.get("source_type") == "CENSUS":
                self.assertNotEqual(rh.get("coordinate_source_type"), "CENSUS")
                self.assertIn(rh.get("coordinate_source_type"), ["OSM", "GOVERNMENT", "KSDMA"])

    def test_kottai_remains_osm_sourced_and_null_pop(self):
        json_path = backend_dir / "data" / "kodagu_settlements.json"
        ingest_kodagu_settlements(json_path=json_path, repo=self.repo)

        habs = {h["id"]: h for h in self.repo.get_all_habitations()}
        kottai = habs.get("SET-KOD-VIR-05")

        self.assertIsNotNone(kottai)
        self.assertEqual(kottai["name"], "Kottai Settlement")
        self.assertEqual(kottai["source_type"], "OSM")
        self.assertEqual(kottai["coordinate_source_type"], "OSM")
        self.assertIsNone(kottai["population"])


if __name__ == "__main__":
    unittest.main()
