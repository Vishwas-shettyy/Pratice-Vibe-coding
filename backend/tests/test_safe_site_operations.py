import unittest
from app.services.repository import Repository
from app.services.safe_site_service import SafeSiteService, SCENARIO_ID

class TestSafeSiteOperations(unittest.TestCase):
    def setUp(self):
        self.repo = Repository(db_url=None)
        self.service = SafeSiteService(self.repo)
        
        self.facility = {
            "id": "fac_1",
            "osm_element_id": "node/1",
            "name": "Test School",
            "district": "Kodagu",
            "lat": 12.0,
            "lng": 75.5,
            "facility_type": "SCHOOL",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        }
        self.repo.upsert_facility(self.facility)
        
    def test_facility_operational_relationship(self):
        self.service.initialize_deterministic_operations()
        ops = self.repo.get_all_safe_site_operations()
        self.assertEqual(len(ops), 1)
        self.assertEqual(ops[0]["facility_id"], "fac_1")
        
    def test_scenario_provenance(self):
        self.service.initialize_deterministic_operations()
        ops = self.repo.get_all_safe_site_operations()
        self.assertEqual(ops[0]["data_status"], "SCENARIO")
        self.assertEqual(ops[0]["scenario_id"], SCENARIO_ID)
        
        # Original facility should still be REAL
        facs = self.repo.get_all_facilities()
        self.assertEqual(facs[0]["data_status"], "REAL")
        
    def test_deterministic_capacity_assumptions(self):
        self.repo.upsert_facility({**self.facility, "id": "fac_2", "facility_type": "COLLEGE"})
        self.repo.upsert_facility({**self.facility, "id": "fac_3", "facility_type": "HOSPITAL"})
        self.repo.upsert_facility({**self.facility, "id": "fac_4", "facility_type": "UNKNOWN"})
        
        self.service.initialize_deterministic_operations()
        sites = {s["facility"]["id"]: s["operations"] for s in self.service.get_all_safe_sites()}
        
        self.assertEqual(sites["fac_1"]["capacity"], 200) # School
        self.assertEqual(sites["fac_2"]["capacity"], 500) # College
        self.assertEqual(sites["fac_3"]["capacity"], 100) # Hospital
        self.assertEqual(sites["fac_4"]["capacity"], 50)  # Unknown
        
    def test_deterministic_suitability_calculation(self):
        self.repo.upsert_facility({**self.facility, "id": "fac_2", "facility_type": "HOSPITAL"})
        self.service.initialize_deterministic_operations()
        
        sites = {s["facility"]["id"]: s["operations"] for s in self.service.get_all_safe_sites()}
        
        # School: capacity=200, water=True. score = 30(ACTIVE) + 30(cap>100) + 10(water) = 70 (CONDITIONAL)
        self.assertEqual(sites["fac_1"]["suitability_level"], "CONDITIONAL")
        self.assertEqual(sites["fac_1"]["suitability_score"], 70)
        
        # Hospital: cap=100, water/food/med/power=True. score = 30(ACTIVE) + 15(cap>0) + 40(resources) = 85 (SUITABLE)
        self.assertEqual(sites["fac_2"]["suitability_level"], "SUITABLE")
        self.assertEqual(sites["fac_2"]["suitability_score"], 85)
        self.assertIn("Medical ready", sites["fac_2"]["assessment_reason"])

    def test_available_capacity_calculation(self):
        op = self.service.calculate_deterministic_suitability(self.facility)
        self.assertEqual(op["available_capacity"], op["capacity"] - op["occupancy"])

    def test_invalid_facility_reference(self):
        res = self.service.get_safe_site("invalid_fac")
        self.assertIsNone(res)

if __name__ == "__main__":
    unittest.main()
