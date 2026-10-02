import os
import unittest
from unittest.mock import patch
from app.services.repository import Repository
from app.services.data_service import INITIAL_SHELTERS, INITIAL_RESOURCES

MOCK_HABITATIONS = [
    {"id": "HAB-101", "name": "Village A", "code": "VIL-A", "district": "Mysuru", "region": "Kaveri Basin", "lat": 12.31, "lng": 76.62, "population": 680},
    {"id": "HAB-102", "name": "Village B", "code": "VIL-B", "district": "Chamarajanagar", "region": "Mudhall Hills", "lat": 12.28, "lng": 76.67, "population": 450},
    {"id": "HAB-103", "name": "Village C", "code": "VIL-C", "district": "Mysuru", "region": "Chamundi Slope", "lat": 12.29, "lng": 76.59, "population": 300},
    {"id": "HAB-104", "name": "Village D", "code": "VIL-D", "district": "Mandya", "region": "KRS Lowlands", "lat": 12.34, "lng": 76.65, "population": 520},
    {"id": "HAB-105", "name": "Village E", "code": "VIL-E", "district": "Mysuru", "region": "East Plateau", "lat": 12.25, "lng": 76.70, "population": 310},
    {"id": "HAB-106", "name": "Village F", "code": "VIL-F", "district": "Kodagu Border", "region": "Western Edge", "lat": 12.32, "lng": 76.55, "population": 220},
]

class TestRepository(unittest.TestCase):
    def setUp(self):
        # We will test the memory fallback
        self.repo = Repository(db_url=None)
        
        # We need to test the database layer as well, but the prompt says:
        # "Do not require a live production database for ordinary unit tests.
        # If PostgreSQL integration tests require a database, clearly separate them."
        # We will mock the psycopg2 connection or just use memory fallback.
        # The prompt says: fallback to in-memory mode when DATABASE_URL is absent
        self.repo.seed_data(MOCK_HABITATIONS, INITIAL_SHELTERS, INITIAL_RESOURCES)

    def test_fallback_mode(self):
        self.assertTrue(self.repo.in_memory)
        self.assertEqual(len(self.repo.get_all_habitations()), 6)
        self.assertEqual(len(self.repo.get_all_shelters()), 4)

    def test_reading_habitations(self):
        habs = self.repo.get_all_habitations()
        self.assertTrue(isinstance(habs, list))
        self.assertGreater(len(habs), 0)
        self.assertEqual(habs[0]["id"], "HAB-101")

    def test_reading_shelters(self):
        shelters = self.repo.get_all_shelters()
        self.assertTrue(isinstance(shelters, list))
        self.assertGreater(len(shelters), 0)
        self.assertEqual(shelters[0]["id"], "SAFE-01")

    def test_reading_resources(self):
        res = self.repo.get_resources()
        self.assertTrue(isinstance(res, dict))
        self.assertIn("emergencyVehicles", res)

    def test_shelter_assignment_persistence(self):
        updated = self.repo.update_habitation_relocation(
            area_id="HAB-102",
            status="Assigned",
            assigned_shelter_id="SAFE-04"
        )
        self.assertIsNotNone(updated)
        self.assertEqual(updated["assignedShelterId"], "SAFE-04")
        self.assertEqual(updated["relocationStatus"], "Assigned")

        # Verify it persists in memory
        habs = self.repo.get_all_habitations()
        hab_102 = next((h for h in habs if h["id"] == "HAB-102"), None)
        self.assertEqual(hab_102["assignedShelterId"], "SAFE-04")
        self.assertEqual(hab_102["relocationStatus"], "Assigned")

    def test_evacuation_status_persistence(self):
        updated = self.repo.update_habitation_relocation(
            area_id="HAB-103",
            status="Completed"
        )
        self.assertIsNotNone(updated)
        self.assertEqual(updated["evacuationProgress"], 100)
        self.assertEqual(updated["relocationStatus"], "Completed")

        # Verify it persists in memory
        habs = self.repo.get_all_habitations()
        hab_103 = next((h for h in habs if h["id"] == "HAB-103"), None)
        self.assertEqual(hab_103["evacuationProgress"], 100)
        self.assertEqual(hab_103["relocationStatus"], "Completed")

    @patch('app.services.repository.psycopg2')
    def test_postgres_connection_attempt(self, mock_psycopg2):
        # We test that the repo attempts to use psycopg2 if URL is set
        repo = Repository(db_url="postgres://user:pass@localhost:5432/db")
        self.assertFalse(repo.in_memory)
        mock_psycopg2.connect.assert_called_once()

    def test_observation_insert_and_retrieve(self):
        sample_obs = {
            "id": "OBS-MYS-01",
            "station_name": "Mysuru Hydro Station",
            "district": "Mysuru",
            "river_basin": "Kaveri Basin",
            "lat": 12.31,
            "lng": 76.65,
            "elevation_m": 770.0,
            "parameter_name": "RAINFALL_24H_MM",
            "parameter_value": 115.5,
            "parameter_unit": "mm",
            "observation_time": "2026-10-02T08:00:00Z",
            "source_name": "IMD Hydromet Division",
            "source_url": "https://hydro.imd.gov.in",
            "source_dataset": "Daily Station Rainfall",
            "source_type": "GOVERNMENT",
            "data_status": "REAL"
        }
        inserted = self.repo.upsert_observation(sample_obs)
        self.assertIsNotNone(inserted)
        self.assertEqual(inserted["id"], "OBS-MYS-01")

        all_obs = self.repo.get_observations()
        self.assertEqual(len(all_obs), 1)
        self.assertEqual(all_obs[0]["station_name"], "Mysuru Hydro Station")
        self.assertEqual(all_obs[0]["parameter_value"], 115.5)

    def test_observation_duplicate_upsert_behavior(self):
        obs1 = {
            "id": "OBS-MYS-01",
            "station_name": "Mysuru Hydro Station",
            "district": "Mysuru",
            "parameter_name": "RAINFALL_24H_MM",
            "parameter_value": 100.0,
            "source_name": "IMD",
            "source_type": "GOVERNMENT",
            "data_status": "REAL"
        }
        self.repo.upsert_observation(obs1)

        # Upsert with same ID but updated rainfall value
        obs2 = {
            "id": "OBS-MYS-01",
            "station_name": "Mysuru Hydro Station",
            "district": "Mysuru",
            "parameter_name": "RAINFALL_24H_MM",
            "parameter_value": 140.0,
            "source_name": "IMD",
            "source_type": "GOVERNMENT",
            "data_status": "REAL"
        }
        self.repo.upsert_observation(obs2)

        all_obs = self.repo.get_observations()
        self.assertEqual(len(all_obs), 1, "Duplicate ID must update existing record rather than creating a second record")
        self.assertEqual(all_obs[0]["parameter_value"], 140.0)

    def test_observation_district_filtering(self):
        obs_mys = {
            "id": "OBS-MYS-01",
            "station_name": "Mysuru Station",
            "district": "Mysuru",
            "parameter_name": "RAINFALL_24H_MM",
            "parameter_value": 85.0
        }
        obs_man = {
            "id": "OBS-MAN-01",
            "station_name": "Mandya Station",
            "district": "Mandya",
            "parameter_name": "RAINFALL_24H_MM",
            "parameter_value": 95.0
        }
        self.repo.upsert_observation(obs_mys)
        self.repo.upsert_observation(obs_man)

        mys_obs = self.repo.get_observations_by_district("Mysuru")
        self.assertEqual(len(mys_obs), 1)
        self.assertEqual(mys_obs[0]["id"], "OBS-MYS-01")

        man_obs = self.repo.get_observations_by_district("MANDYA")
        self.assertEqual(len(man_obs), 1)
        self.assertEqual(man_obs[0]["id"], "OBS-MAN-01")

    def test_observation_parameter_filtering(self):
        obs_rain = {
            "id": "OBS-MYS-01",
            "station_name": "Mysuru Station",
            "district": "Mysuru",
            "parameter_name": "RAINFALL_24H_MM",
            "parameter_value": 85.0
        }
        obs_stage = {
            "id": "OBS-MYS-02",
            "station_name": "KRS Reservoir Gauge",
            "district": "Mandya",
            "parameter_name": "RIVER_STAGE_M",
            "parameter_value": 4.25
        }
        self.repo.upsert_observation(obs_rain)
        self.repo.upsert_observation(obs_stage)

        rain_results = self.repo.get_observations_by_parameter("RAINFALL_24H_MM")
        self.assertEqual(len(rain_results), 1)
        self.assertEqual(rain_results[0]["id"], "OBS-MYS-01")

        stage_results = self.repo.get_observations_by_parameter("RIVER_STAGE_M")
        self.assertEqual(len(stage_results), 1)
        self.assertEqual(stage_results[0]["id"], "OBS-MYS-02")

    def test_observation_in_memory_fallback(self):
        self.assertTrue(self.repo.in_memory)
        self.assertIn("observations", self.repo.memory_store)
        self.assertEqual(len(self.repo.memory_store["observations"]), 0)

    def test_observation_provenance_fields(self):
        obs = {
            "id": "OBS-PROV-01",
            "station_name": "Chamundi Observatory",
            "district": "Mysuru",
            "source_name": "Central Water Commission",
            "source_url": "https://indiawris.gov.in",
            "source_dataset": "India-WRIS River Stage",
            "source_type": "GOVERNMENT",
            "data_status": "REAL"
        }
        self.repo.upsert_observation(obs)
        retrieved = self.repo.get_observations()[0]

        self.assertEqual(retrieved["source_name"], "Central Water Commission")
        self.assertEqual(retrieved["source_url"], "https://indiawris.gov.in")
        self.assertEqual(retrieved["source_dataset"], "India-WRIS River Stage")
        self.assertEqual(retrieved["source_type"], "GOVERNMENT")
        self.assertEqual(retrieved["data_status"], "REAL")

    @patch('app.services.repository.psycopg2')
    def test_postgres_observation_sql_execution(self, mock_psycopg2):
        mock_conn = mock_psycopg2.connect.return_value
        mock_cur = mock_conn.__enter__.return_value.cursor.return_value.__enter__.return_value

        repo = Repository(db_url="postgres://user:pass@localhost:5432/db")
        obs = {
            "id": "OBS-PG-01",
            "station_name": "PG Test Station",
            "district": "Mysuru",
            "parameter_name": "RAINFALL_24H_MM",
            "parameter_value": 75.0,
            "source_name": "IMD",
            "source_type": "GOVERNMENT",
            "data_status": "REAL"
        }
        repo.upsert_observation(obs)

        self.assertTrue(mock_cur.execute.called)
        executed_sql = mock_cur.execute.call_args[0][0]
        self.assertIn("INSERT INTO environmental_observations", executed_sql)
        self.assertIn("ON CONFLICT (id) DO UPDATE", executed_sql)

    def test_real_dataset_ingestion_and_validation(self):
        from scripts.ingest_real_data import validate_observation, ingest_dataset

        # Test invalid negative rainfall
        bad_obs = {
            "id": "INVALID-01",
            "station_name": "Test Station",
            "district": "Mysuru",
            "lat": 12.3,
            "lng": 76.6,
            "parameter_name": "RAINFALL_24H_MM",
            "parameter_value": -50.0,
            "source_name": "IMD",
            "source_url": "https://hydro.imd.gov.in",
            "source_dataset": "Test",
            "source_type": "GOVERNMENT",
            "data_status": "REAL"
        }
        is_valid, reason = validate_observation(bad_obs)
        self.assertFalse(is_valid)
        self.assertIn("Negative rainfall", reason)

        # Test invalid latitude outside Karnataka
        bad_lat_obs = dict(bad_obs, parameter_value=50.0, lat=45.0)
        is_valid, reason = validate_observation(bad_lat_obs)
        self.assertFalse(is_valid)
        self.assertIn("Latitude", reason)

        # Test full ingestion of real_observations_karnataka.json dataset
        json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "real_observations_karnataka.json"))
        summary = ingest_dataset(json_path=json_path, repository=self.repo)

        self.assertEqual(summary["total_records"], 22)
        self.assertEqual(summary["successful_ingested"], 22)
        self.assertEqual(summary["failed_records"], 0)

        # Verify all ingested observations have data_status REAL and authentic source metadata
        observations = self.repo.get_observations()
        self.assertEqual(len(observations), 22)
        for obs in observations:
            self.assertEqual(obs["data_status"], "REAL")
            self.assertIn(obs["source_type"], ["GOVERNMENT", "OPEN_DATA", "OSM"])
            self.assertTrue(obs["source_url"].startswith("http"))

if __name__ == '__main__':
    unittest.main()
