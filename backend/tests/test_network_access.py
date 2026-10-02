import unittest
from app.services.repository import Repository
from scripts.connect_network_access import compute_components, find_nearest_node, haversine, connect_network_access

class TestNetworkAccess(unittest.TestCase):
    
    def setUp(self):
        self.repo = Repository(db_url=None) # In memory
        
    def test_haversine_distance(self):
        d = haversine(12.0, 75.0, 12.0, 75.0)
        self.assertEqual(d, 0.0)
        d2 = haversine(12.0, 75.0, 13.0, 75.0)
        self.assertTrue(110000 < d2 < 112000)
        
    def test_find_nearest_node(self):
        nodes = [
            {"id": "n1", "lat": 12.0, "lng": 75.0},
            {"id": "n2", "lat": 12.1, "lng": 75.1}
        ]
        nearest, dist = find_nearest_node(12.05, 75.05, nodes)
        self.assertIsNotNone(nearest)
        
    def test_proposed_road_exclusion(self):
        nodes = [
            {"id": "n1", "lat": 12.0, "lng": 75.0},
            {"id": "n2", "lat": 12.1, "lng": 75.1}
        ]
        edges = [
            {"id": "e1", "from_node": "n1", "to_node": "n2", "highway_class": "proposed"}
        ]
        comp_map = compute_components(nodes, edges)
        # Since edge is proposed, it's excluded, so n1 and n2 are in separate components
        # (meaning max_size is 1, they won't share the same root in parent)
        self.assertNotEqual(comp_map["n1"], comp_map["n2"])
        
    def test_component_identification(self):
        nodes = [
            {"id": "n1", "lat": 12.0, "lng": 75.0},
            {"id": "n2", "lat": 12.1, "lng": 75.1},
            {"id": "n3", "lat": 12.2, "lng": 75.2}
        ]
        edges = [
            {"id": "e1", "from_node": "n1", "to_node": "n2", "highway_class": "residential"}
        ]
        comp_map = compute_components(nodes, edges)
        self.assertEqual(comp_map["n1"], "LARGEST_COMPONENT")
        self.assertEqual(comp_map["n2"], "LARGEST_COMPONENT")
        self.assertNotEqual(comp_map["n3"], "LARGEST_COMPONENT")
        
    def test_connect_network_access(self):
        # Create a graph
        self.repo.upsert_graph_node({"id": "n1", "lat": 12.0, "lng": 75.0})
        self.repo.upsert_graph_node({"id": "n2", "lat": 12.1, "lng": 75.1})
        self.repo.upsert_graph_edge({"id": "e1", "from_node": "n1", "to_node": "n2", "highway_class": "residential"})
        
        # Create a settlement
        self.repo.upsert_habitation({
            "id": "hab1", "name": "Test Hab", "lat": 12.001, "lng": 75.001
        })
        
        # Create unresolved settlement
        self.repo.upsert_habitation({
            "id": "hab2", "name": "Unresolved Hab"
        })
        
        results = connect_network_access(self.repo)
        
        access_records = self.repo.get_all_network_access()
        self.assertEqual(len(access_records), 1)
        self.assertEqual(access_records[0]["entity_id"], "hab1")
        self.assertEqual(access_records[0]["graph_node_id"], "n1")
        self.assertEqual(access_records[0]["component_id"], "LARGEST_COMPONENT")
        
        self.assertEqual(results["settlements"]["total"], 2)
        self.assertEqual(results["settlements"]["unresolved"], 1)
        self.assertEqual(results["settlements"]["connected"], 1)

if __name__ == "__main__":
    unittest.main()
