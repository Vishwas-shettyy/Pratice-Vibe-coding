import heapq
from app.services.repository import repo

class RoutingService:
    def __init__(self, repository=None):
        self.repo = repository or repo
        self._graph = None
        self._edges_data = None
        self._nodes_data = None
        
    def _build_graph(self):
        nodes = self.repo.get_all_graph_nodes()
        edges = self.repo.get_all_graph_edges()
        
        self._nodes_data = {n["id"]: n for n in nodes}
        self._edges_data = {e["id"]: e for e in edges}
        
        self._graph = {n["id"]: [] for n in nodes}
        
        for e in edges:
            if e.get("highway_class") == "proposed":
                continue
                
            u = e["from_node"]
            v = e["to_node"]
            length = e.get("length_m", 0)
            edge_id = e["id"]
            is_oneway = e.get("is_oneway", False)
            
            if u not in self._graph: self._graph[u] = []
            if v not in self._graph: self._graph[v] = []
                
            self._graph[u].append((v, edge_id, length, "forward"))
            
            if not is_oneway:
                self._graph[v].append((u, edge_id, length, "backward"))

    def find_shortest_path(self, source_node_id, dest_node_id, scenario_id=None):
        if self._graph is None:
            self._build_graph()
            
        if source_node_id not in self._nodes_data or dest_node_id not in self._nodes_data:
            return {"status": "INVALID_NODE"}
            
        if source_node_id == dest_node_id:
            return {
                "status": "SUCCESS",
                "source_node": source_node_id,
                "destination_node": dest_node_id,
                "distance_m": 0.0,
                "distance_km": 0.0,
                "edge_count": 0,
                "estimated_travel_time_min": 0.0,
                "nodes": [source_node_id],
                "edges": [],
                "geometry": {"type": "LineString", "coordinates": []}
            }

        # Dijkstra
        pq = [(0.0, source_node_id)]
        distances = {source_node_id: 0.0}
        came_from = {} # node -> (previous_node, edge_id, direction)
        
        visited = set()
        
        scenario_impacts = {}
        if scenario_id:
            impacts = self.repo.get_scenario_road_impacts(scenario_id)
            for imp in impacts:
                scenario_impacts[imp["road_id"]] = imp["impact_status"]
        
        while pq:
            current_dist, u = heapq.heappop(pq)
            
            if u in visited:
                continue
            visited.add(u)
            
            if u == dest_node_id:
                break
                
            for v, edge_id, base_weight, direction in self._graph.get(u, []):
                if v in visited:
                    continue
                    
                impact = scenario_impacts.get(edge_id, "OPEN")
                if impact == "BLOCKED":
                    continue
                    
                weight = base_weight
                if impact == "RESTRICTED":
                    weight = base_weight * 10 # Strong penalty to avoid if alternative exists
                    
                alt = current_dist + weight
                if v not in distances or alt < distances[v]:
                    distances[v] = alt
                    came_from[v] = (u, edge_id, direction)
                    heapq.heappush(pq, (alt, v))
                    
        if dest_node_id not in came_from:
            return {"status": "NO_ROUTE"}
            
        # Reconstruct path
        path_nodes = []
        path_edges = []
        geom_coords = []
        
        curr = dest_node_id
        while curr != source_node_id:
            path_nodes.append(curr)
            prev_node, edge_id, direction = came_from[curr]
            path_edges.append(edge_id)
            
            edge_data = self._edges_data[edge_id]
            geom = edge_data.get("geometry") or {}
            coords = geom.get("coordinates", [])
            
            # If we traversed backward, the coordinates need to be reversed
            if direction == "backward":
                coords = list(reversed(coords))
                
            # To avoid duplicating the shared node coordinate between consecutive edges,
            # we will skip the first coordinate of each edge if it's not the first edge overall,
            # but since we are iterating backwards from dest to source, we'll collect all,
            # then clean up overlaps.
            geom_coords.append(coords)
            
            curr = prev_node
            
        path_nodes.append(source_node_id)
        
        # Reverse to get source -> dest
        path_nodes.reverse()
        path_edges.reverse()
        geom_coords.reverse()
        
        # Merge coords smoothly
        final_coords = []
        for i, segment in enumerate(geom_coords):
            if i == 0:
                final_coords.extend(segment)
            else:
                # skip the first point to avoid duplication
                if len(segment) > 1:
                    final_coords.extend(segment[1:])
                else:
                    final_coords.extend(segment)
                    
        total_dist_m = round(distances[dest_node_id], 2)
        
        return {
            "status": "SUCCESS",
            "source_node": source_node_id,
            "destination_node": dest_node_id,
            "distance_m": total_dist_m,
            "distance_km": round(total_dist_m / 1000, 3),
            "edge_count": len(path_edges),
            "estimated_travel_time_min": round((total_dist_m / 1000) / 30 * 60, 1), # Assumption: 30 km/h average speed
            "nodes": path_nodes,
            "edges": path_edges,
            "geometry": {
                "type": "LineString",
                "coordinates": final_coords
            }
        }

routing_service = RoutingService()
