import unittest
from app import create_app
from app.services.risk_service import get_environmental_signals, calculate_risk, enrich_area_risk

class TestEnvironmentalRiskSignals(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_real_observations_retrievable_by_risk_layer(self):
        area = {"id": "HAB-101", "district": "Kodagu"}
        signals = get_environmental_signals(area)

        self.assertTrue(signals["has_real_signals"])
        self.assertEqual(signals["district"], "Kodagu")
        self.assertGreater(signals["observations_count"], 0)
        self.assertIn("summary", signals)
        self.assertIn("max_rainfall_24h_mm", signals["summary"])

    def test_environmental_signals_preserve_source_provenance(self):
        area = {"id": "HAB-101", "district": "Kodagu"}
        signals = get_environmental_signals(area)
        
        real_obs = signals["real_measurements"]
        self.assertGreater(len(real_obs), 0)
        sample = real_obs[0]

        required_provenance = ["source_name", "source_url", "source_dataset", "source_type", "data_status"]
        for key in required_provenance:
            self.assertIn(key, sample)
            self.assertTrue(sample[key])
        self.assertEqual(sample["data_status"], "REAL")

    def test_missing_observations_fall_back_safely(self):
        area_missing = {"id": "HAB-999", "district": "NonExistentDistrictXYZ"}
        signals = get_environmental_signals(area_missing)

        self.assertFalse(signals["has_real_signals"])
        self.assertEqual(signals["district"], "NonExistentDistrictXYZ")
        self.assertEqual(signals["observations_count"], 0)
        self.assertEqual(signals["real_measurements"], [])
        self.assertEqual(signals["summary"], {})

        # Ensure enrich_area_risk handles missing observations without failing or changing risk_score
        enriched = enrich_area_risk(area_missing)
        self.assertIn("environmental_signals", enriched)
        self.assertFalse(enriched["environmental_signals"]["has_real_signals"])

    def test_existing_risk_calculations_remain_unchanged(self):
        habitation_sample = {
            "id": "HAB-101",
            "name": "Village A (Kaveri Basin)",
            "district": "Kodagu",
            "population": 680,
            "affectedPopulation": 610,
            "elderly": 140,
            "children": 195,
            "medicalPriority": 42,
            "hazardType": "Flash Flood & Inundation",
            "hazardLevel": "Immediate",
            "distanceToShelterKm": 4.2,
            "roadCondition": "Passable (4WD / Buses)",
            "evacuationProgress": 65,
            "hazardDetails": {
                "floodRisk": "CRITICAL",
                "landslideRisk": "LOW"
            }
        }

        # Baseline formula result
        calc_result = calculate_risk(habitation_sample)
        enriched = enrich_area_risk(habitation_sample)

        # Confirm score & level match exact calculation
        self.assertEqual(enriched["risk_score"], calc_result["risk_score"])
        self.assertEqual(enriched["risk_level"], calc_result["risk_level"])
        self.assertEqual(calc_result["risk_score"], 82)
        self.assertEqual(calc_result["risk_level"], "HIGH")

    def test_existing_risk_boundary_tests_pass(self):
        boundary_cases = [
            (39, "LOW"),
            (40, "MODERATE"),
            (41, "MODERATE"),
            (69, "MODERATE"),
            (70, "HIGH"),
            (71, "HIGH"),
            (84, "HIGH"),
            (85, "CRITICAL"),
            (86, "CRITICAL"),
        ]

        from app.services.risk_service import _determine_risk_level
        for score, expected_level in boundary_cases:
            self.assertEqual(_determine_risk_level(score), expected_level)

if __name__ == "__main__":
    unittest.main()
