#!/usr/bin/env python3
import json
import sys
import math
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.repository import Repository

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # radius of Earth in meters
    phi_1 = math.radians(lat1)
    phi_2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calc_length(geometry):
    length = 0.0
    for i in range(len(geometry) - 1):
        lon1, lat1 = geometry[i]
        lon2, lat2 = geometry[i+1]
        length += haversine(lat1, lon1, lat2, lon2)
    return length

def build_routing_graph(repo=None):
    json_path = backend_dir / "data" / "kodagu_osm_roads_raw.json"
    if not json_path.exists():
        print("Raw OSM data not found. Please run ingest_osm_roads.py first.")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        osm_data = json.load(f)

    elements = osm_data.get("elements", [])
    ways = [e for e in elements if e.get("type") == "way"]

    node_freq = {}
    way_endpoints = set()
    node_coords = {}

    # First pass: count frequencies and endpoints
    for way in ways:
        nodes = way.get("nodes", [])
        geom = way.get("geometry", [])
        if not nodes or len(nodes) < 2 or len(nodes) != len(geom):
            continue
            
        way_endpoints.add(nodes[0])
        way_endpoints.add(nodes[-1])
        
        for idx, n_id in enumerate(nodes):
            node_freq[n_id] = node_freq.get(n_id, 0) + 1
            if n_id not in node_coords:
                node_coords[n_id] = (geom[idx]["lat"], geom[idx]["lon"])

    # Identify graph nodes: intersections (>1 frequency) and endpoints
    graph_nodes = set()
    for n_id, freq in node_freq.items():
        if freq > 1 or n_id in way_endpoints:
            graph_nodes.add(n_id)

    if repo is None:
        repo = Repository()

    print(f"Total graph nodes to insert: {len(graph_nodes)}")
    
    # Insert nodes
    for n_id in graph_nodes:
        lat, lon = node_coords[n_id]
        repo.upsert_graph_node({
            "id": f"osm_node_{n_id}",
            "lat": lat,
            "lng": lon,
            "source_name": "OpenStreetMap",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        })

    print("Building edges...")
    
    total_edges = 0
    proposed_edges = 0
    oneway_edges = 0
    restricted_access_edges = 0
    
    # Second pass: split ways into edges
    for way in ways:
        way_id = way.get("id")
        nodes = way.get("nodes", [])
        geom = way.get("geometry", [])
        tags = way.get("tags", {})
        
        if not nodes or len(nodes) < 2 or len(nodes) != len(geom):
            continue
            
        highway_class = tags.get("highway")
        
        # We start a segment at nodes[0]
        current_segment_nodes = [nodes[0]]
        current_segment_geom = [[geom[0]["lon"], geom[0]["lat"]]]
        
        segment_index = 0
        
        for i in range(1, len(nodes)):
            n_id = nodes[i]
            g = geom[i]
            current_segment_nodes.append(n_id)
            current_segment_geom.append([g["lon"], g["lat"]])
            
            if n_id in graph_nodes:
                # End of a segment!
                from_node = f"osm_node_{current_segment_nodes[0]}"
                to_node = f"osm_node_{current_segment_nodes[-1]}"
                
                length_m = calc_length(current_segment_geom)
                is_oneway = tags.get("oneway") == "yes"
                access = tags.get("access")
                
                edge_id = f"osm_edge_{way_id}_{segment_index}"
                repo.upsert_graph_edge({
                    "id": edge_id,
                    "from_node": from_node,
                    "to_node": to_node,
                    "osm_way_id": f"osm_way_{way_id}",
                    "name": tags.get("name"),
                    "highway_class": highway_class,
                    "geometry": {
                        "type": "LineString",
                        "coordinates": current_segment_geom
                    },
                    "length_m": length_m,
                    "surface": tags.get("surface"),
                    "bridge": tags.get("bridge") == "yes",
                    "is_oneway": is_oneway,
                    "access": access,
                    "maxspeed": tags.get("maxspeed"),
                    "source_name": "OpenStreetMap",
                    "source_type": "OPEN_GEO",
                    "data_status": "REAL"
                })
                
                total_edges += 1
                segment_index += 1
                
                if highway_class == "proposed":
                    proposed_edges += 1
                if is_oneway:
                    oneway_edges += 1
                if access and access != "yes":
                    restricted_access_edges += 1
                
                # Start next segment
                current_segment_nodes = [n_id]
                current_segment_geom = [[g["lon"], g["lat"]]]

    # Stats and Connected Components (Optional basic validation)
    # Since we are using dicts, we can just rely on get_all_graph_nodes
    nodes_in_db = len(repo.get_all_graph_nodes())
    edges_in_db = len(repo.get_all_graph_edges())

    # Disjoint sets for connected components
    parent = { f"osm_node_{n_id}": f"osm_node_{n_id}" for n_id in graph_nodes }
    def find(i):
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]
    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j

    edges_list = repo.get_all_graph_edges()
    for e in edges_list:
        union(e["from_node"], e["to_node"])

    component_sizes = {}
    for n in parent:
        root = find(n)
        component_sizes[root] = component_sizes.get(root, 0) + 1
        
    num_components = len(component_sizes)
    largest_cc = max(component_sizes.values()) if component_sizes else 0
    isolated_nodes = sum(1 for c in component_sizes.values() if c == 1)

    print("\n--- GRAPH FOUNDATION SUMMARY ---")
    print(f"Source OSM ways: {len(ways)}")
    print(f"Graph nodes generated: {nodes_in_db}")
    print(f"Graph edges generated: {edges_in_db}")
    print(f"Proposed-road edges: {proposed_edges}")
    print(f"One-way edges: {oneway_edges}")
    print(f"Roads with access restrictions: {restricted_access_edges}")
    print(f"Connected components: {num_components}")
    print(f"Largest connected component size: {largest_cc} nodes")
    print(f"Isolated nodes: {isolated_nodes}")

    return {
        "source_ways": len(ways),
        "nodes": nodes_in_db,
        "edges": edges_in_db,
        "proposed": proposed_edges,
        "oneway": oneway_edges,
        "restricted": restricted_access_edges,
        "components": num_components,
        "largest_cc": largest_cc,
        "isolated": isolated_nodes
    }

if __name__ == "__main__":
    build_routing_graph()
