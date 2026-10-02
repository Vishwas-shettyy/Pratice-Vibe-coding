import unittest
from app.services.repository import Repository
from app.services.scenario_service import ScenarioService

class TestScenarioHazard(unittest.TestCase):
    def setUp(self):
        self.repo = Repository(db_url=None)
        self.service = ScenarioService(self.repo)
        
        self.habitation = {
            "id": "set_1",
            "name": "Test Habitation",
            "lat": 12.0,
            "lng": 75.5,
            "data_status": "REAL"
        }
        self.repo.upsert_habitation(self.habitation)
        
        self.road = {
            "id": "12345",
            "highway_class": "residential",
            "geometry": [[12.0, 75.5], [12.1, 75.6]],
            "data_status": "REAL"
        }
        self.repo.upsert_road(self.road)

        # Baseline hazard exposure to test it's not modified
        self.repo.upsert_hazard_exposure({
            "id": "hazard_set_1",
            "entity_id": "set_1",
            "entity_type": "SETTLEMENT",
            "flood_exposure": "UNKNOWN",
            "data_status": "DERIVED"
        })
        
    def test_scenario_creation_and_provenance(self):
        scenario = self.service.get_or_create_default_scenario()
        self.assertEqual(scenario["data_status"], "SCENARIO")
        self.assertEqual(scenario["id"], "KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO")
        
    def test_scenario_deterministic_run(self):
        scenario = self.service.get_or_create_default_scenario()
        res = self.service.run_scenario(scenario["id"])
        
        self.assertEqual(res["exposures_calculated"], 1) # 1 habitation
        self.assertEqual(res["roads_evaluated"], 1) # 1 road
        
        exps = self.repo.get_scenario_exposures(scenario["id"])
        self.assertEqual(len(exps), 1)
        self.assertEqual(exps[0]["data_status"], "SCENARIO")
        self.assertEqual(exps[0]["entity_id"], "set_1")
        
        imps = self.repo.get_scenario_road_impacts(scenario["id"])
        self.assertEqual(len(imps), 1)
        self.assertEqual(imps[0]["data_status"], "SCENARIO")
        self.assertEqual(imps[0]["road_id"], "12345")
        
        # Test repeat execution produces identical results (idempotent updates)
        res2 = self.service.run_scenario(scenario["id"])
        self.assertEqual(len(self.repo.get_scenario_exposures(scenario["id"])), 1)
        self.assertEqual(len(self.repo.get_scenario_road_impacts(scenario["id"])), 1)
        
    def test_real_data_remains_unchanged(self):
        scenario = self.service.get_or_create_default_scenario()
        self.service.run_scenario(scenario["id"])
        
        # Check roads
        roads = self.repo.get_all_roads()
        self.assertEqual(roads[0]["data_status"], "REAL")
        self.assertNotIn("impact_status", roads[0])
        
        # Check derived hazard exposures
        hazards = self.repo.get_all_hazard_exposures()
        self.assertEqual(hazards[0]["data_status"], "DERIVED")
        self.assertEqual(hazards[0]["flood_exposure"], "UNKNOWN")
        
if __name__ == "__main__":
    unittest.main()
