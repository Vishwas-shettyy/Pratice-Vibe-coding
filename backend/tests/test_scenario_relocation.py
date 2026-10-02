import unittest
from app.services.repository import Repository
from app.services.scenario_service import ScenarioService
from app.services.relocation_service import RelocationService
from app.services.routing_service import routing_service

class TestScenarioRelocation(unittest.TestCase):
    def setUp(self):
        self.repo = Repository(db_url=None)
        self.scenario_service = ScenarioService(self.repo)
        self.relocation_service = RelocationService(self.repo)
        routing_service.repo = self.repo
        
        self.scenario = self.scenario_service.get_or_create_default_scenario()
        
        # Setup real graph and habitations
        self.repo.upsert_graph_node({"id": "node_hab", "lat": 12.0, "lng": 75.5})
        self.repo.upsert_graph_node({"id": "node_fac1", "lat": 12.01, "lng": 75.51})
        self.repo.upsert_graph_node({"id": "node_fac2", "lat": 12.02, "lng": 75.52})
        
        self.repo.upsert_graph_edge({
            "id": "edge_h_f1", "from_node": "node_hab", "to_node": "node_fac1",
            "length_m": 1000, "highway_class": "residential", "is_oneway": False
        })
        self.repo.upsert_graph_edge({
            "id": "edge_h_f2", "from_node": "node_hab", "to_node": "node_fac2",
            "length_m": 2000, "highway_class": "residential", "is_oneway": False
        })
        
        self.repo.upsert_habitation({
            "id": "hab_1", "name": "Settlement 1", "lat": 12.0, "lng": 75.5
        })
        self.repo.upsert_network_access({
            "id": "na_h1", "entity_id": "hab_1", "entity_type": "SETTLEMENT", "graph_node_id": "node_hab"
        })
        
        # Setup facility 1: Active and safe, but small
        self.repo.upsert_facility({
            "id": "fac_1", "name": "Facility 1", "lat": 12.01, "lng": 75.51
        })
        self.repo.upsert_network_access({
            "id": "na_f1", "entity_id": "fac_1", "entity_type": "FACILITY", "graph_node_id": "node_fac1"
        })
        self.repo.upsert_safe_site_operation({
            "id": "op_f1", "facility_id": "fac_1", "operational_status": "ACTIVE", "available_capacity": 50
        })
        self.repo.upsert_scenario_exposure({
            "id": "se_fac1", "scenario_id": self.scenario["id"], "entity_id": "fac_1", "overall_exposure": "LOW"
        })
        
        # Setup facility 2: Active and safe, large
        self.repo.upsert_facility({
            "id": "fac_2", "name": "Facility 2", "lat": 12.02, "lng": 75.52
        })
        self.repo.upsert_network_access({
            "id": "na_f2", "entity_id": "fac_2", "entity_type": "FACILITY", "graph_node_id": "node_fac2"
        })
        self.repo.upsert_safe_site_operation({
            "id": "op_f2", "facility_id": "fac_2", "operational_status": "ACTIVE", "available_capacity": 500
        })
        self.repo.upsert_scenario_exposure({
            "id": "se_fac2", "scenario_id": self.scenario["id"], "entity_id": "fac_2", "overall_exposure": "LOW"
        })
        
        # Habitation scenario exposure -> CRITICAL priority
        self.repo.upsert_scenario_exposure({
            "id": "se_hab1", "scenario_id": self.scenario["id"], "entity_id": "hab_1", "overall_exposure": "HIGH"
        })
        
    def test_relocation_decision_engine(self):
        routing_service._graph = None # force rebuild
        res = self.relocation_service.run_scenario_relocation(self.scenario["id"])
        
        self.assertEqual(len(res), 1)
        rel = res[0]
        
        self.assertEqual(rel["priority"], "CRITICAL")
        self.assertEqual(rel["data_status"], "SCENARIO")
        self.assertEqual(rel["candidate_count"], 2)
        
        # It picks shortest route regardless of capacity, but marks CAPACITY_INSUFFICIENT (or UNKNOWN)
        self.assertEqual(rel["recommended_site_id"], "fac_1")
        self.assertEqual(rel["capacity_status"], "UNKNOWN_REQUIREMENT (SCENARIO ASSUMPTION)")
        self.assertIsNone(rel["required_capacity"])
        
        self.assertIn("CRITICAL priority because scenario exposure is HIGH", rel["recommendation_reason"])
        
    def test_filter_closed_and_hazard(self):
        # Mark fac_1 as CLOSED, and fac_2 as HIGH hazard
        self.repo.upsert_safe_site_operation({
            "id": "op_f1", "facility_id": "fac_1", "operational_status": "CLOSED", "available_capacity": 50
        })
        self.repo.upsert_scenario_exposure({
            "id": "se_fac2", "scenario_id": self.scenario["id"], "entity_id": "fac_2", "overall_exposure": "HIGH"
        })
        
        routing_service._graph = None
        res = self.relocation_service.run_scenario_relocation(self.scenario["id"])
        
        rel = res[0]
        self.assertIsNone(rel["recommended_site_id"])
        self.assertEqual(rel["route_status"], "NO_ROUTE")
        self.assertEqual(rel["candidate_count"], 0)
        
    def test_blocked_route(self):
        # Block the edge to fac_1
        self.repo.upsert_scenario_road_impact({
            "id": "imp_1", "scenario_id": self.scenario["id"], "road_id": "edge_h_f1", "impact_status": "BLOCKED"
        })
        
        routing_service._graph = None
        res = self.relocation_service.run_scenario_relocation(self.scenario["id"])
        
        rel = res[0]
        self.assertEqual(rel["recommended_site_id"], "fac_2")
        self.assertEqual(rel["capacity_status"], "UNKNOWN_REQUIREMENT (SCENARIO ASSUMPTION)")
        self.assertEqual(rel["candidate_count"], 1) # Only fac_2 is reachable

if __name__ == "__main__":
    unittest.main()
