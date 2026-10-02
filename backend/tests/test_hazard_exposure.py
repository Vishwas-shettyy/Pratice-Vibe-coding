import unittest
from app.services.repository import Repository
from app.services.hazard_service import HazardService

class TestHazardExposure(unittest.TestCase):
    def setUp(self):
        self.repo = Repository(db_url=None)
        self.service = HazardService(self.repo)
        
        self.habitation = {
            "id": "set_1",
            "name": "Test Habitation",
            "lat": 12.0,
            "lng": 75.5,
            "data_status": "REAL"
        }
        self.repo.upsert_habitation(self.habitation)
        
        self.facility = {
            "id": "fac_1",
            "osm_element_id": "node/1",
            "name": "Test Facility",
            "lat": 12.0,
            "lng": 75.6,
            "data_status": "REAL"
        }
        self.repo.upsert_facility(self.facility)
        
    def test_derived_exposure_provenance(self):
        self.service.assess_all_entities()
        exps = self.repo.get_all_hazard_exposures()
        
        self.assertEqual(len(exps), 2)
        for exp in exps:
            self.assertEqual(exp["data_status"], "DERIVED")
            self.assertEqual(exp["flood_exposure"], "UNKNOWN")
            self.assertEqual(exp["landslide_exposure"], "UNKNOWN")
            self.assertEqual(exp["overall_exposure"], "UNKNOWN")
            self.assertIn("Requires explicit geospatial hazard overlay", exp["methodology"])
            self.assertIn("Lacks site-specific", exp["evidence"])
            
    def test_real_observations_unchanged(self):
        # We test that the original data is unmodified
        self.service.assess_all_entities()
        facs = self.repo.get_all_facilities()
        sets = self.repo.get_all_habitations()
        
        self.assertEqual(facs[0]["data_status"], "REAL")
        self.assertEqual(sets[0]["data_status"], "REAL")
        self.assertNotIn("flood_exposure", facs[0])
        self.assertNotIn("landslide_exposure", sets[0])
        
    def test_missing_evidence_unknown(self):
        self.service.assess_all_entities()
        exp = self.service.get_hazard_exposure("SETTLEMENT", "set_1")
        self.assertEqual(exp["hazard_exposure"]["flood_exposure"], "UNKNOWN")
        
    def test_invalid_entity_reference(self):
        res = self.service.get_hazard_exposure("SETTLEMENT", "invalid_set")
        self.assertIsNone(res)

if __name__ == "__main__":
    unittest.main()
