import unittest
import json
from app import create_app
from app.services.repository import repo
from app.services.scenario_service import scenario_service
from app.services.relocation_service import relocation_service
from app.services.routing_service import routing_service

class TestE2EPipeline(unittest.TestCase):
    def setUp(self):
        self.app = create_app().test_client()
        self.app.testing = True
        
        # Clear specific stores to ensure clean e2e setup
        repo.memory_store["graph_nodes"] = {}
        repo.memory_store["graph_edges"] = {}
        repo.memory_store["facilities"] = {}
        repo.memory_store["safe_site_operations"] = {}
        repo.memory_store["habitations"] = {}
        repo.memory_store["network_access"] = {}
        repo.memory_store["scenario_road_impacts"] = {}
        repo.memory_store["scenario_exposures"] = {}
        repo.memory_store["scenario_relocations"] = {}
        repo.memory_store["roads"] = {}
        
        # Set up realistic end-to-end graph
        repo.upsert_graph_node({"id": "n1", "lat": 12.0, "lng": 75.0})
        repo.upsert_graph_node({"id": "n2", "lat": 12.01, "lng": 75.01})
        repo.upsert_graph_node({"id": "n3", "lat": 12.02, "lng": 75.02})
        repo.upsert_graph_node({"id": "n4", "lat": 12.03, "lng": 75.03})
        repo.upsert_graph_node({"id": "n_isolated", "lat": 12.1, "lng": 75.1})
        
        # Roads (Real data format)
        repo.upsert_road({"id": "r1", "data_status": "REAL"})
        repo.upsert_road({"id": "r2", "data_status": "REAL"})
        repo.upsert_road({"id": "r3", "data_status": "REAL"})
        
        # Edges
        # Path 1: n1 -> n2 (short but will be blocked)
        repo.upsert_graph_edge({"id": "e1", "from_node": "n1", "to_node": "n2", "length_m": 1000, "is_oneway": False})
        # Path 2: n1 -> n3 -> n2 (alternative to n2)
        repo.upsert_graph_edge({"id": "e2", "from_node": "n1", "to_node": "n3", "length_m": 1500, "is_oneway": False})
        repo.upsert_graph_edge({"id": "e3", "from_node": "n3", "to_node": "n2", "length_m": 1500, "is_oneway": False})
        
        # Path to n4 (Restricted route test)
        repo.upsert_graph_edge({"id": "e4", "from_node": "n1", "to_node": "n4", "length_m": 2000, "is_oneway": False})
        repo.upsert_graph_edge({"id": "e5", "from_node": "n1", "to_node": "n4", "length_m": 3000, "is_oneway": False}) # longer alternative
        
        routing_service._graph = None # force rebuild
        
        # Settlement 1 (normal)
        repo.upsert_habitation({"id": "hab1", "name": "Settlement 1", "lat": 12.0, "lng": 75.0, "data_status": "REAL"})
        repo.upsert_network_access({"id": "na1", "entity_id": "hab1", "entity_type": "SETTLEMENT", "graph_node_id": "n1"})
        
        # Settlement 2 (isolated)
        repo.upsert_habitation({"id": "hab2", "name": "Settlement 2", "lat": 12.1, "lng": 75.1, "data_status": "REAL"})
        repo.upsert_network_access({"id": "na2", "entity_id": "hab2", "entity_type": "SETTLEMENT", "graph_node_id": "n_isolated"})
        
        # Facility 1 (at n2) - Will be blocked on shortest path, uses alt
        repo.upsert_facility({"id": "fac1", "name": "Facility 1", "lat": 12.01, "lng": 75.01, "data_status": "REAL"})
        repo.upsert_network_access({"id": "na3", "entity_id": "fac1", "entity_type": "FACILITY", "graph_node_id": "n2"})
        repo.upsert_safe_site_operation({"id": "op1", "facility_id": "fac1", "operational_status": "ACTIVE", "available_capacity": 500})
        
        # Facility 2 (at n4) - Has restricted shortest path, uses longer alt
        repo.upsert_facility({"id": "fac2", "name": "Facility 2", "lat": 12.03, "lng": 75.03, "data_status": "REAL"})
        repo.upsert_network_access({"id": "na4", "entity_id": "fac2", "entity_type": "FACILITY", "graph_node_id": "n4"})
        repo.upsert_safe_site_operation({"id": "op2", "facility_id": "fac2", "operational_status": "ACTIVE", "available_capacity": 50}) # Small capacity
        
        self.scenario = scenario_service.get_or_create_default_scenario()
        
        # Force scenario impacts to test logic precisely
        repo.upsert_scenario_road_impact({"id": "imp1", "scenario_id": self.scenario["id"], "road_id": "e1", "impact_status": "BLOCKED", "data_status": "SCENARIO"})
        repo.upsert_scenario_road_impact({"id": "imp2", "scenario_id": self.scenario["id"], "road_id": "e4", "impact_status": "RESTRICTED", "data_status": "SCENARIO"})
        
        # Force exposures
        repo.upsert_scenario_exposure({"id": "se1", "scenario_id": self.scenario["id"], "entity_id": "hab1", "overall_exposure": "HIGH", "data_status": "SCENARIO"})
        repo.upsert_scenario_exposure({"id": "se2", "scenario_id": self.scenario["id"], "entity_id": "fac1", "overall_exposure": "LOW", "data_status": "SCENARIO"})
        repo.upsert_scenario_exposure({"id": "se3", "scenario_id": self.scenario["id"], "entity_id": "fac2", "overall_exposure": "LOW", "data_status": "SCENARIO"})
        repo.upsert_scenario_exposure({"id": "se4", "scenario_id": self.scenario["id"], "entity_id": "hab2", "overall_exposure": "LOW", "data_status": "SCENARIO"})

    def test_e2e_api_flow(self):
        # Run relocation
        resp = self.app.post(f"/api/relocation/scenario/{self.scenario['id']}/run")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()["data"]
        self.assertEqual(len(data), 2)
        
        # Verify Hab1 -> Fac1 via alt route (e2 + e3 = 3000m) because e1 (1000m) is BLOCKED. 
        # Wait, Fac2 is at n4. e5 is 3000m. Fac1 has 500 cap, Fac2 has 50 cap.
        # Both are 3000m away. Sort is stable or by travel time.
        
        hab1_rel = next(r for r in data if r["settlement_id"] == "hab1")
        self.assertEqual(hab1_rel["priority"], "CRITICAL")
        self.assertEqual(hab1_rel["data_status"], "SCENARIO")
        
        # Capacity logic
        self.assertIsNone(hab1_rel["required_capacity"]) 
        self.assertEqual(hab1_rel["capacity_status"], "UNKNOWN_REQUIREMENT (SCENARIO ASSUMPTION)")
        
        # Hab2 -> No Route
        hab2_rel = next(r for r in data if r["settlement_id"] == "hab2")
        self.assertEqual(hab2_rel["route_status"], "NO_ROUTE")
        self.assertIsNone(hab2_rel["recommended_site_id"])
        
    def test_restricted_road_alternative(self):
        # We know e4 is RESTRICTED (weight 2000 * 10 = 20000)
        # Alt e5 is 3000m
        # Shortest path to n4 should pick e5.
        routing_service._graph = None
        path = routing_service.find_shortest_path("n1", "n4", self.scenario["id"])
        self.assertEqual(path["edges"], ["e5"])
        self.assertEqual(path["distance_m"], 3000)
        
    def test_blocked_road_rejection(self):
        # e1 is BLOCKED. Shortest path to n2 should be e2 + e3
        routing_service._graph = None
        path = routing_service.find_shortest_path("n1", "n2", self.scenario["id"])
        self.assertEqual(path["edges"], ["e2", "e3"])
        self.assertEqual(path["distance_m"], 3000)
        
    def test_no_mutation_of_real_data(self):
        roads = repo.get_all_roads()
        for r in roads:
            self.assertEqual(r["data_status"], "REAL")
            self.assertNotIn("impact_status", r)
            
        facs = repo.get_all_facilities()
        for f in facs:
            self.assertEqual(f["data_status"], "REAL")
            
    def test_idempotency(self):
        res1 = relocation_service.run_scenario_relocation(self.scenario["id"])
        res2 = relocation_service.run_scenario_relocation(self.scenario["id"])
        
        self.assertEqual(len(res1), len(res2))
        self.assertEqual(res1[0]["recommended_site_id"], res2[0]["recommended_site_id"])
        
if __name__ == "__main__":
    unittest.main()
