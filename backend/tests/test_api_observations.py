import unittest
import json
from app import create_app
from app.services.repository import repo

class TestEnvironmentalObservationsAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        self.app.testing = True

    def test_get_all_environmental_observations(self):
        response = self.client.get("/api/environmental-observations")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        
        # Test standard response envelope
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("message"), "Environmental observations retrieved")
        self.assertIsInstance(data.get("data"), list)
        self.assertGreaterEqual(len(data["data"]), 22)

        # Test provenance fields preservation
        sample = data["data"][0]
        required_fields = [
            "id", "station_name", "district", "river_basin", "lat", "lng",
            "elevation_m", "parameter_name", "parameter_value", "parameter_unit",
            "observation_time", "ingestion_time", "source_name", "source_url",
            "source_dataset", "source_type", "data_status"
        ]
        for field in required_fields:
            self.assertIn(field, sample, f"Field '{field}' missing from observation API response")
        self.assertEqual(sample["data_status"], "REAL")

    def test_district_filtering(self):
        response = self.client.get("/api/environmental-observations?district=Kodagu")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("success"))
        
        # All items must be Kodagu
        observations = data["data"]
        self.assertGreater(len(observations), 0)
        for obs in observations:
            self.assertEqual(obs["district"].lower(), "kodagu")

    def test_parameter_filtering(self):
        response = self.client.get("/api/environmental-observations?parameter=RAINFALL_24H_MM")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("success"))
        
        observations = data["data"]
        self.assertGreater(len(observations), 0)
        for obs in observations:
            self.assertEqual(obs["parameter_name"].upper(), "RAINFALL_24H_MM")

    def test_combined_district_and_parameter_filtering(self):
        response = self.client.get("/api/environmental-observations?district=Kodagu&parameter=RAINFALL_24H_MM")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("success"))
        
        observations = data["data"]
        self.assertGreater(len(observations), 0)
        for obs in observations:
            self.assertEqual(obs["district"].lower(), "kodagu")
            self.assertEqual(obs["parameter_name"].upper(), "RAINFALL_24H_MM")

    def test_empty_filter_result(self):
        response = self.client.get("/api/environmental-observations?district=NonExistentDistrict99")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(len(data["data"]), 0)

    def test_existing_apis_unaffected(self):
        # Health check
        res_health = self.client.get("/api/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertTrue(res_health.get_json().get("success"))

        # Dashboard stats
        res_stats = self.client.get("/api/dashboard/stats")
        self.assertEqual(res_stats.status_code, 200)
        self.assertTrue(res_stats.get_json().get("success"))

        # Risk areas
        res_areas = self.client.get("/api/risk-areas")
        self.assertEqual(res_areas.status_code, 200)
        self.assertTrue(res_areas.get_json().get("success"))

if __name__ == "__main__":
    unittest.main()
