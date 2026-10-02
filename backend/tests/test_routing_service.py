import unittest
from app.services.repository import Repository
from app.services.routing_service import RoutingService

class TestRoutingService(unittest.TestCase):
    def setUp(self):
        self.repo = Repository(db_url=None)
        
        # Simple setup
        self.repo.upsert_graph_node({"id": "n1", "lat": 12.0, "lng": 75.0})
        self.repo.upsert_graph_node({"id": "n2", "lat": 12.1, "lng": 75.1})
        self.repo.upsert_graph_node({"id": "n3", "lat": 12.2, "lng": 75.2})
        self.repo.upsert_graph_node({"id": "n4", "lat": 12.3, "lng": 75.3})
        
        # Connected graph: n1 -> n2 -> n3
        self.repo.upsert_graph_edge({
            "id": "e1", "from_node": "n1", "to_node": "n2", "length_m": 100, 
            "geometry": {"type": "LineString", "coordinates": [[75.0, 12.0], [75.1, 12.1]]}
        })
        self.repo.upsert_graph_edge({
            "id": "e2", "from_node": "n2", "to_node": "n3", "length_m": 50,
            "geometry": {"type": "LineString", "coordinates": [[75.1, 12.1], [75.2, 12.2]]}
        })
        
        # Alternative path n1 -> n3 directly but longer
        self.repo.upsert_graph_edge({
            "id": "e3", "from_node": "n1", "to_node": "n3", "length_m": 200,
            "geometry": {"type": "LineString", "coordinates": [[75.0, 12.0], [75.2, 12.2]]}
        })
        
        # Disconnected component n4
        
        self.routing = RoutingService(self.repo)
        
    def test_shortest_path_selection(self):
        res = self.routing.find_shortest_path("n1", "n3")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["distance_m"], 150)
        self.assertEqual(res["nodes"], ["n1", "n2", "n3"])
        self.assertEqual(res["edges"], ["e1", "e2"])
        
    def test_disconnected_components(self):
        res = self.routing.find_shortest_path("n1", "n4")
        self.assertEqual(res["status"], "NO_ROUTE")
        
    def test_proposed_road_excluded(self):
        self.repo.upsert_graph_node({"id": "n5", "lat": 12.0, "lng": 75.0})
        self.repo.upsert_graph_edge({
            "id": "e4", "from_node": "n1", "to_node": "n5", "length_m": 10, "highway_class": "proposed"
        })
        self.routing = RoutingService(self.repo) # Rebuild graph
        res = self.routing.find_shortest_path("n1", "n5")
        self.assertEqual(res["status"], "NO_ROUTE")
        
    def test_one_way_behavior(self):
        self.repo.upsert_graph_node({"id": "n6", "lat": 12.0, "lng": 75.0})
        self.repo.upsert_graph_node({"id": "n7", "lat": 12.1, "lng": 75.1})
        self.repo.upsert_graph_edge({
            "id": "e_oneway", "from_node": "n6", "to_node": "n7", "length_m": 50, "is_oneway": True
        })
        self.routing = RoutingService(self.repo)
        
        # n6 to n7 should work
        res1 = self.routing.find_shortest_path("n6", "n7")
        self.assertEqual(res1["status"], "SUCCESS")
        
        # n7 to n6 should fail
        res2 = self.routing.find_shortest_path("n7", "n6")
        self.assertEqual(res2["status"], "NO_ROUTE")
        
    def test_route_geometry_reconstruction(self):
        # Traveling backwards on an edge to ensure geometry reverses properly
        # e1 is n1 -> n2. Let's travel n2 -> n1.
        res = self.routing.find_shortest_path("n2", "n1")
        self.assertEqual(res["status"], "SUCCESS")
        coords = res["geometry"]["coordinates"]
        self.assertEqual(coords, [[75.1, 12.1], [75.0, 12.0]])
        
    def test_source_equals_destination(self):
        res = self.routing.find_shortest_path("n1", "n1")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["distance_m"], 0.0)
        self.assertEqual(res["nodes"], ["n1"])
        
    def test_invalid_node(self):
        res = self.routing.find_shortest_path("n1", "invalid")
        self.assertEqual(res["status"], "INVALID_NODE")

if __name__ == "__main__":
    unittest.main()
