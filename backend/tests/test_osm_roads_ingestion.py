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

    def test_incomplete_road_data_triggers_async_ingestion_without_blocking_api(self):
        """1. Incomplete road data triggers ingestion without blocking the API response."""
        from app import create_app
        from app.services.scenario_service import scenario_service
        import threading
        import time

        test_repo = Repository(db_url=None)
        test_repo.upsert_habitation({
            "id": "SET-KOD-MAD-01",
            "name": "Madikeri Town",
            "lat": 12.4244,
            "lng": 75.7382,
            "data_status": "REAL"
        })
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
        test_repo.upsert_roads(roads_172)
        self.assertEqual(test_repo.count_roads(), 172)

        # Pre-seed 172 impacts as in production
        for r in roads_172:
            test_repo.upsert_scenario_road_impact({
                "id": f"sri_KODAGU_EXTREME_MONSOON_HARSH_CASE_{r['id']}",
                "scenario_id": "KODAGU_EXTREME_MONSOON_HARSH_CASE",
                "road_id": r["id"],
                "impact_status": "OPEN",
                "data_status": "SCENARIO"
            })

        old_repo = scenario_service.repo
        scenario_service.repo = test_repo
        app = create_app().test_client()

        started_event = threading.Event()
        release_event = threading.Event()

        def slow_ingest(repo_arg):
            started_event.set()
            release_event.wait(timeout=2.0)

        try:
            with patch("scripts.ingest_osm_roads.ingest_osm_roads", side_effect=slow_ingest) as mock_ingest:
                start_time = time.time()
                response = app.get("/api/scenarios/KODAGU_EXTREME_MONSOON_HARSH_CASE/road-impacts")
                elapsed = time.time() - start_time

                # Must return immediately without waiting for slow ingestion
                self.assertLess(elapsed, 1.0, "API response must not block on ingestion")
                self.assertEqual(response.status_code, 200)
                body = response.get_json()
                self.assertTrue(body["success"])
                self.assertEqual(len(body["data"]), 172)

                # Wait for background thread to have started
                started_event.wait(timeout=1.0)
                self.assertTrue(scenario_service.is_ingesting())
                self.assertTrue(mock_ingest.called)

                # Release the worker thread
                release_event.set()
                if scenario_service._ingestion_thread:
                    scenario_service._ingestion_thread.join(timeout=2.0)
        finally:
            release_event.set()
            scenario_service.repo = old_repo

    def test_duplicate_ingestion_not_started_concurrently(self):
        """2. Duplicate ingestion is not started concurrently."""
        from app.services.scenario_service import ScenarioService
        import threading

        repo = Repository(db_url=None)
        service = ScenarioService(repo)

        started_event = threading.Event()
        release_event = threading.Event()

        def slow_ingest(repo_arg):
            started_event.set()
            release_event.wait(timeout=2.0)

        with patch("scripts.ingest_osm_roads.ingest_osm_roads", side_effect=slow_ingest):
            first_started = service.trigger_road_ingestion_async()
            self.assertTrue(first_started, "First ingestion trigger must start")

            started_event.wait(timeout=1.0)
            self.assertTrue(service.is_ingesting())

            # Attempt duplicate trigger while running
            second_started = service.trigger_road_ingestion_async()
            self.assertFalse(second_started, "Duplicate ingestion must be rejected while job is running")

            release_event.set()
            if service._ingestion_thread:
                service._ingestion_thread.join(timeout=2.0)

    def test_complete_2857_roads_does_not_trigger_ingestion(self):
        """3. Complete 2,857-road data does not trigger ingestion."""
        from app.services.scenario_service import ScenarioService

        repo = Repository(db_url=None)
        repo.upsert_habitation({
            "id": "SET-KOD-MAD-01",
            "name": "Madikeri Town",
            "lat": 12.4244,
            "lng": 75.7382,
            "data_status": "REAL"
        })
        roads_2857 = [
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
        repo.upsert_roads(roads_2857)
        self.assertEqual(repo.count_roads(), 2857)

        service = ScenarioService(repo)

        with patch("scripts.ingest_osm_roads.ingest_osm_roads") as mock_ingest:
            service.get_scenario_road_impacts("KODAGU_EXTREME_MONSOON_HARSH_CASE")
            mock_ingest.assert_not_called()
            self.assertFalse(service.is_ingesting())

    def test_existing_scenario_behavior_remains_unchanged(self):
        """4. Existing scenario behavior remains unchanged."""
        from app.services.scenario_service import ScenarioService
        from scripts.ingest_osm_roads import ingest_osm_roads
        from collections import Counter

        repo = Repository(db_url=None)
        repo.upsert_habitation({
            "id": "SET-KOD-MAD-01",
            "name": "Madikeri Town",
            "lat": 12.4244,
            "lng": 75.7382,
            "data_status": "REAL"
        })

        # Ingest real 2,857 roads
        ingest_osm_roads(repo)
        self.assertEqual(repo.count_roads(), 2857)

        service = ScenarioService(repo)
        res = service.run_scenario("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        self.assertEqual(res["roads_evaluated"], 2857)

        impacts = repo.get_scenario_road_impacts("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        self.assertEqual(len(impacts), 2857)

        counts = Counter(x["impact_status"] for x in impacts)
        self.assertEqual(counts["BLOCKED"], 648)
        self.assertEqual(counts["RESTRICTED"], 633)
        self.assertEqual(counts["OPEN"], 1576)

    def test_road_ingestion_trigger_172_vs_2857_and_idempotency(self):
        from app.services.scenario_service import ScenarioService

        repo = Repository(db_url=None)
        repo.upsert_habitation({
            "id": "SET-KOD-MAD-01",
            "name": "Madikeri Town",
            "lat": 12.4244,
            "lng": 75.7382,
            "data_status": "REAL"
        })

        # 1. 172 existing roads causes ingestion to run
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

            service.run_scenario("KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO", wait_for_ingestion=True)
            self.assertTrue(mock_ingest.called, "Ingestion must run when 172 roads are present (< 2857)")
            self.assertEqual(repo.count_roads(), 2857)

        # 2. 2,857 existing roads does not run ingestion
        with patch("scripts.ingest_osm_roads.ingest_osm_roads") as mock_ingest:
            service.run_scenario("KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO", wait_for_ingestion=True)
            mock_ingest.assert_not_called()
            self.assertEqual(repo.count_roads(), 2857)

        # 3. Ingestion remains idempotent
        clean_repo = Repository(db_url=None)
        import json
        from pathlib import Path
        raw_path = Path(__file__).resolve().parent.parent / "data" / "kodagu_osm_roads_raw.json"
        with open(raw_path, "r", encoding="utf-8") as f:
            raw_elements = json.load(f)["elements"]

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

        summary1 = ingest_osm_roads(clean_repo)
        self.assertEqual(summary1["ingested_records"], 2857)
        self.assertEqual(clean_repo.count_roads(), 2857)

        summary2 = ingest_osm_roads(clean_repo)
        self.assertEqual(summary2["ingested_records"], 2857)
        self.assertEqual(clean_repo.count_roads(), 2857)

if __name__ == "__main__":
    unittest.main()
