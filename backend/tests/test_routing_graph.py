import unittest
from app.services.repository import Repository
import math

class TestRoutingGraph(unittest.TestCase):
    
    def setUp(self):
        self.repo = Repository(db_url=None) # In memory
        
    def test_shared_node_intersection(self):
        # A simple intersection of 2 ways at a shared node
        self.repo.upsert_graph_node({"id": "node_1", "lat": 12.0, "lng": 75.0})
        self.repo.upsert_graph_node({"id": "node_2", "lat": 12.1, "lng": 75.1})
        self.repo.upsert_graph_node({"id": "node_3", "lat": 12.2, "lng": 75.2})
        
        edge1 = {
            "id": "edge_1", "from_node": "node_1", "to_node": "node_2",
            "osm_way_id": "way_1", "length_m": 100
        }
        edge2 = {
            "id": "edge_2", "from_node": "node_2", "to_node": "node_3",
            "osm_way_id": "way_2", "length_m": 150
        }
        
        self.repo.upsert_graph_edge(edge1)
        self.repo.upsert_graph_edge(edge2)
        
        edges = self.repo.get_all_graph_edges()
        self.assertEqual(len(edges), 2)
        
        from_nodes = [e["from_node"] for e in edges]
        self.assertIn("node_2", from_nodes)
        
    def test_disconnected_roads(self):
        self.repo.upsert_graph_node({"id": "node_1", "lat": 12.0, "lng": 75.0})
        self.repo.upsert_graph_node({"id": "node_2", "lat": 12.1, "lng": 75.1})
        self.repo.upsert_graph_node({"id": "node_3", "lat": 12.2, "lng": 75.2})
        self.repo.upsert_graph_node({"id": "node_4", "lat": 12.3, "lng": 75.3})
        
        self.repo.upsert_graph_edge({
            "id": "edge_1", "from_node": "node_1", "to_node": "node_2"
        })
        self.repo.upsert_graph_edge({
            "id": "edge_2", "from_node": "node_3", "to_node": "node_4"
        })
        
        # Test that there is no shared node
        edges = self.repo.get_all_graph_edges()
        nodes1 = {edges[0]["from_node"], edges[0]["to_node"]}
        nodes2 = {edges[1]["from_node"], edges[1]["to_node"]}
        self.assertEqual(len(nodes1.intersection(nodes2)), 0)

    def test_oneway_and_proposed(self):
        self.repo.upsert_graph_edge({
            "id": "edge_1", "from_node": "n1", "to_node": "n2",
            "is_oneway": True, "highway_class": "proposed"
        })
        e = self.repo.get_all_graph_edges()[0]
        self.assertTrue(e["is_oneway"])
        self.assertEqual(e["highway_class"], "proposed")
        
    def test_haversine_length_calculation(self):
        from scripts.build_routing_graph import calc_length
        # 1 degree of latitude is roughly 111,139 meters
        # Let's test two points along the equator / same longitude
        geom = [[75.0, 12.0], [75.0, 13.0]]
        length = calc_length(geom)
        self.assertTrue(110000 < length < 112000)

if __name__ == "__main__":
    unittest.main()
