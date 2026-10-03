import unittest
import json
from unittest.mock import patch, mock_open, MagicMock

# Import the validation logic and ingestion script
from scripts.ingest_osm_roads import validate_road_record, ingest_osm_roads
from app.services.repository import Repository

class TestOSMRoadsIngestion(unittest.TestCase):
    
    def setUp(self):
        self.repo = Repository(db_url=None)  # Use in-memory for tests

    def test_geometry_validation_all_inside(self):
        # lat 11.5 to 13.0, lon 75.0 to 76.5
        record = {
            "id": "osm_way_1",
            "highway_class": "primary",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [75.5, 12.0],  # Valid
                    [75.6, 12.1]   # Valid
                ]
            },
            "source_name": "OpenStreetMap",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        }
        is_valid, reason = validate_road_record(record)
        self.assertTrue(is_valid)
        self.assertEqual(reason, "")

    def test_geometry_validation_one_outside(self):
        record = {
            "id": "osm_way_2",
            "highway_class": "primary",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [75.5, 12.0],  # Valid
                    [74.9, 12.1]   # Invalid longitude (74.9 < 75.0)
                ]
            },
            "source_name": "OpenStreetMap",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        }
        is_valid, reason = validate_road_record(record)
        self.assertFalse(is_valid)
        self.assertIn("falls outside Kodagu boundary limits", reason)

    def test_proposed_highway_class_identifiable(self):
        record = {
            "id": "osm_way_3",
            "highway_class": "proposed",
            "geometry": {
                "type": "LineString",
                "coordinates": [[75.5, 12.0], [75.6, 12.1]]
            },
            "source_name": "OpenStreetMap",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        }
        
        self.repo.upsert_road(record)
        
        roads = self.repo.get_all_roads()
        self.assertEqual(len(roads), 1)
        self.assertEqual(roads[0]["highway_class"], "proposed")
        
    def test_idempotency(self):
        record = {
            "id": "osm_way_4",
            "name": "Main Street",
            "highway_class": "residential",
            "geometry": {
                "type": "LineString",
                "coordinates": [[75.5, 12.0], [75.6, 12.1]]
            },
            "source_name": "OpenStreetMap",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        }
        
        # Ingest first time
        self.repo.upsert_road(record)
        self.assertEqual(len(self.repo.get_all_roads()), 1)
        
        # Ingest second time
        self.repo.upsert_road(record)
        self.assertEqual(len(self.repo.get_all_roads()), 1)
        
        # Verify the data
        road = self.repo.get_all_roads()[0]
        self.assertEqual(road["id"], "osm_way_4")
        self.assertEqual(road["name"], "Main Street")

    def test_batched_ingestion(self):
        records = [
            {
                "id": f"osm_way_batch_{i}",
                "name": f"Road {i}",
                "highway_class": "residential",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[75.5, 12.0], [75.6, 12.1]]
                },
                "source_name": "OpenStreetMap",
                "source_type": "OPEN_GEO",
                "data_status": "REAL"
            }
            for i in range(10)
        ]

        res = self.repo.upsert_roads(records)
        self.assertEqual(len(res), 10)
        self.assertEqual(len(self.repo.get_all_roads()), 10)

        # Re-upsert to verify batch idempotency
        res2 = self.repo.upsert_roads(records)
        self.assertEqual(len(res2), 10)
        self.assertEqual(len(self.repo.get_all_roads()), 10)

    def test_repository_count_roads(self):
        repo = Repository(db_url=None)
        self.assertEqual(repo.count_roads(), 0)
        repo.upsert_road({
            "id": "osm_way_count_test",
            "name": "Test Way",
            "highway_class": "primary",
            "geometry": {"type": "LineString", "coordinates": [[75.5, 12.0], [75.6, 12.1]]},
            "source_name": "OpenStreetMap",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        })
        self.assertEqual(repo.count_roads(), 1)

    def test_road_ingestion_trigger_172_vs_2857_and_idempotency(self):
        from app.services.scenario_service import ScenarioService

        repo = Repository(db_url=None)
        # Real Kodagu settlement so cold-start check triggers
        repo.upsert_habitation({
            "id": "SET-KOD-MAD-01",
            "name": "Madikeri Town",
            "lat": 12.4244,
            "lng": 75.7382,
            "data_status": "REAL"
        })

        # 1. Proving 172 existing roads causes ingestion to run
        roads_172 = [
            {
                "id": f"osm_way_{i}",
                "name": f"Road {i}",
                "highway_class": "residential",
                "geometry": {"type": "LineString", "coordinates": [[75.5, 12.0], [75.6, 12.1]]},
                "source_name": "OpenStreetMap",
                "source_type": "OPEN_GEO",
                "data_status": "REAL"
            }
            for i in range(172)
        ]
        repo.upsert_roads(roads_172)
        self.assertEqual(repo.count_roads(), 172)

        service = ScenarioService(repo)

        with patch("scripts.ingest_osm_roads.ingest_osm_roads") as mock_ingest:
            # Simulate the batch ingestion populating the remaining records up to 2857
            def populate_roads(target_repo):
                full_records = [
                    {
                        "id": f"osm_way_{i}",
                        "name": f"Road {i}",
                        "highway_class": "residential",
                        "geometry": {"type": "LineString", "coordinates": [[75.5, 12.0], [75.6, 12.1]]},
                        "source_name": "OpenStreetMap",
                        "source_type": "OPEN_GEO",
                        "data_status": "REAL"
                    }
                    for i in range(2857)
                ]
                target_repo.upsert_roads(full_records)
            mock_ingest.side_effect = populate_roads

            service.run_scenario("KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO")
            self.assertTrue(mock_ingest.called, "Ingestion must run when 172 roads are present (< 2857)")
            self.assertEqual(repo.count_roads(), 2857)

        # 2. Proving 2,857 existing roads does not run ingestion
        with patch("scripts.ingest_osm_roads.ingest_osm_roads") as mock_ingest:
            service.run_scenario("KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO")
            mock_ingest.assert_not_called()
            self.assertEqual(repo.count_roads(), 2857)

        # 3. Proving ingestion remains idempotent
        from scripts.ingest_osm_roads import ingest_osm_roads
        clean_repo = Repository(db_url=None)
        import json
        from pathlib import Path
        raw_path = Path(__file__).resolve().parent.parent / "data" / "kodagu_osm_roads_raw.json"
        with open(raw_path, "r", encoding="utf-8") as f:
            raw_elements = json.load(f)["elements"]

        # Seed 172 roads from raw data
        seed_records = []
        for el in raw_elements[:172]:
            if el.get("type") == "way" and el.get("geometry"):
                coords = [[pt["lon"], pt["lat"]] for pt in el["geometry"]]
                seed_records.append({
                    "id": f"osm_way_{el['id']}",
                    "name": el.get("tags", {}).get("name"),
                    "highway_class": el.get("tags", {}).get("highway"),
                    "geometry": {"type": "LineString", "coordinates": coords},
                    "source_name": "OpenStreetMap",
                    "source_type": "OPEN_GEO",
                    "data_status": "REAL"
                })
        clean_repo.upsert_roads(seed_records)
        self.assertEqual(clean_repo.count_roads(), 172)

        # Ingestion pass 1: completes the full dataset
        summary1 = ingest_osm_roads(clean_repo)
        self.assertEqual(summary1["ingested_records"], 2857)
        self.assertEqual(clean_repo.count_roads(), 2857)

        # Ingestion pass 2: idempotent re-run preserves exact count
        summary2 = ingest_osm_roads(clean_repo)
        self.assertEqual(summary2["ingested_records"], 2857)
        self.assertEqual(clean_repo.count_roads(), 2857)

if __name__ == "__main__":
    unittest.main()
