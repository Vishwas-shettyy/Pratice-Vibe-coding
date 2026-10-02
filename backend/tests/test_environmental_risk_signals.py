import unittest
from app import create_app
from app.services.risk_service import (
    get_environmental_signals,
    calculate_risk,
    enrich_area_risk,
    classify_rainfall_intensity,
    interpret_observation,
    interpret_observations
)

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
        self.assertIn("interpreted_evidence", signals)

    def test_rainfall_classification_boundaries(self):
        # IMD 24h rainfall intensity bands
        self.assertEqual(classify_rainfall_intensity(1.2), "VERY_LIGHT")
        self.assertEqual(classify_rainfall_intensity(2.4), "VERY_LIGHT")
        self.assertEqual(classify_rainfall_intensity(2.5), "LIGHT")
        self.assertEqual(classify_rainfall_intensity(15.5), "LIGHT")
        self.assertEqual(classify_rainfall_intensity(15.6), "MODERATE")
        self.assertEqual(classify_rainfall_intensity(64.4), "MODERATE")
        self.assertEqual(classify_rainfall_intensity(64.5), "HEAVY")
        self.assertEqual(classify_rainfall_intensity(96.0), "HEAVY")
        self.assertEqual(classify_rainfall_intensity(115.5), "HEAVY")
        self.assertEqual(classify_rainfall_intensity(115.6), "VERY_HEAVY")
        self.assertEqual(classify_rainfall_intensity(184.0), "VERY_HEAVY")
        self.assertEqual(classify_rainfall_intensity(204.4), "VERY_HEAVY")
        self.assertEqual(classify_rainfall_intensity(204.5), "EXTREMELY_HEAVY")
        self.assertEqual(classify_rainfall_intensity(250.0), "EXTREMELY_HEAVY")

    def test_bhagamandala_184mm_example_interpretation(self):
        obs = {
            "id": "OBS-IMD-KOD-01",
            "station_name": "Bhagamandala Hydro-Met Observatory",
            "district": "Kodagu",
            "river_basin": "Kaveri Basin",
            "lat": 12.3908,
            "lng": 75.5348,
            "elevation_m": 868.0,
            "parameter_name": "RAINFALL_24H_MM",
            "parameter_value": 184.0,
            "parameter_unit": "mm",
            "observation_time": "2024-07-18T08:30:00Z",
            "source_name": "IMD Hydro-Met Division",
            "source_url": "https://hydro.imd.gov.in",
            "source_dataset": "Customized Rainfall Information System (CRIS)",
            "source_type": "GOVERNMENT",
            "data_status": "REAL"
        }

        interpreted = interpret_observation(obs)

        self.assertEqual(interpreted["parameter"], "RAINFALL_24H_MM")
        self.assertEqual(interpreted["observed_value"], 184.0)
        self.assertEqual(interpreted["unit"], "mm")
        self.assertEqual(interpreted["interpretation"], "VERY_HEAVY")
        self.assertEqual(interpreted["interpretation_source"], "IMD")
        self.assertEqual(interpreted["evidence_type"], "REAL_OBSERVATION")
        self.assertEqual(interpreted["source_name"], "IMD Hydro-Met Division")
        self.assertEqual(interpreted["source_url"], "https://hydro.imd.gov.in")
        self.assertEqual(interpreted["observation_time"], "2024-07-18T08:30:00Z")

    def test_river_stage_metadata_required(self):
        obs = {
            "id": "OBS-CWC-HAR-01",
            "station_name": "Harangi Dam Gauge Station",
            "district": "Kodagu",
            "parameter_name": "RIVER_STAGE_M",
            "parameter_value": 15.2,
            "parameter_unit": "meters",
            "source_name": "Central Water Commission (CWC)",
            "data_status": "REAL"
        }
        interpreted = interpret_observation(obs)

        self.assertEqual(interpreted["evidence_type"], "REAL_OBSERVATION")
        self.assertEqual(interpreted["interpretation_status"], "THRESHOLD_METADATA_REQUIRED")
        self.assertEqual(interpreted["interpretation_source"], "CWC")
        self.assertIn("metadata required", interpreted["note"].lower())

    def test_reservoir_inflow_context_only(self):
        obs = {
            "id": "OBS-CWC-KRS-02",
            "station_name": "KRS Inflow Peak Discharge Gauge",
            "district": "Mandya",
            "parameter_name": "RESERVOIR_INFLOW_CUSECS",
            "parameter_value": 52400.0,
            "parameter_unit": "cusecs",
            "source_name": "Central Water Commission (CWC)",
            "data_status": "REAL"
        }
        interpreted = interpret_observation(obs)

        self.assertEqual(interpreted["evidence_type"], "REAL_OBSERVATION")
        self.assertEqual(interpreted["interpretation_status"], "CONTEXT_ONLY")
        self.assertEqual(interpreted["interpretation_source"], "CWC")

    def test_terrain_elevation_reference_only(self):
        obs = {
            "id": "OBS-OSM-KOD-01",
            "station_name": "Brahmagiri Ridge Peak",
            "district": "Kodagu",
            "parameter_name": "TERRAIN_ELEVATION_M",
            "parameter_value": 1608.0,
            "parameter_unit": "meters",
            "source_name": "OpenStreetMap & ISRO Bhuvan",
            "data_status": "REAL"
        }
        interpreted = interpret_observation(obs)

        self.assertEqual(interpreted["evidence_type"], "TOPOGRAPHIC_REFERENCE")
        self.assertEqual(interpreted["interpretation_status"], "REFERENCE_ONLY")
        self.assertEqual(interpreted["interpretation_source"], "OSM_BHUVAN")
        # Elevation does not produce a numeric risk score
        self.assertNotIn("risk_score", interpreted)

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
        self.assertEqual(signals["interpreted_evidence"], [])
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
