#!/usr/bin/env python3
import sys
import math
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.repository import Repository

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi_1 = math.radians(lat1)
    phi_2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def compute_components(nodes, edges):
    parent = { n["id"]: n["id"] for n in nodes }
    def find(i):
        if parent[i] == i: return i
        parent[i] = find(parent[i])
        return parent[i]
    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j
            
    # Connect based on non-proposed edges
    for e in edges:
        if e.get("highway_class") == "proposed":
            continue
        union(e["from_node"], e["to_node"])
        
    sizes = {}
    for n in parent:
        root = find(n)
        sizes[root] = sizes.get(root, 0) + 1
        
    largest_root = None
    max_size = 0
    for root, size in sizes.items():
        if size > max_size:
            max_size = size
            largest_root = root
            
    component_map = {}
    for n in parent:
        root = find(n)
        if root == largest_root:
            component_map[n] = "LARGEST_COMPONENT"
        else:
            component_map[n] = f"COMPONENT_{root}"
            
    return component_map

def find_nearest_node(lat, lng, nodes):
    min_dist = float('inf')
    nearest = None
    for n in nodes:
        d = haversine(lat, lng, n["lat"], n["lng"])
        if d < min_dist:
            min_dist = d
            nearest = n
    return nearest, min_dist

def connect_network_access(repo=None):
    if repo is None:
        repo = Repository()
        
    nodes = repo.get_all_graph_nodes()
    edges = repo.get_all_graph_edges()
    
    if not nodes:
        print("Graph nodes not found. Run graph build script first.")
        sys.exit(1)
        
    component_map = compute_components(nodes, edges)
    
    habitations = repo.get_all_habitations()
    shelters = repo.get_all_shelters()
    
    results = {
        "settlements": {"total": len(habitations), "connected": 0, "unresolved": 0, "largest_cc": 0, "smaller_cc": 0, "distances": []},
        "shelters": {"total": len(shelters), "connected": 0, "unresolved": 0, "largest_cc": 0, "smaller_cc": 0, "distances": []}
    }
    
    # Process Habitations
    for hab in habitations:
        lat = hab.get("lat")
        lng = hab.get("lng")
        
        if lat is None or lng is None:
            results["settlements"]["unresolved"] += 1
            continue
            
        nearest_node, dist = find_nearest_node(lat, lng, nodes)
        if not nearest_node:
            results["settlements"]["unresolved"] += 1
            continue
            
        comp_id = component_map[nearest_node["id"]]
        
        repo.upsert_network_access({
            "id": f"access_hab_{hab['id']}",
            "entity_id": hab["id"],
            "entity_type": "SETTLEMENT",
            "graph_node_id": nearest_node["id"],
            "access_distance_m": round(dist, 2),
            "component_id": comp_id,
            "is_operational": True,
            "connection_method": "NEAREST_GRAPH_NODE",
            "source_type": "DERIVED",
            "data_status": "DERIVED"
        })
        
        results["settlements"]["connected"] += 1
        results["settlements"]["distances"].append(dist)
        if comp_id == "LARGEST_COMPONENT":
            results["settlements"]["largest_cc"] += 1
        else:
            results["settlements"]["smaller_cc"] += 1
            
    # Process Shelters
    for sh in shelters:
        lat = sh.get("lat")
        lng = sh.get("lng")
        
        if lat is None or lng is None:
            results["shelters"]["unresolved"] += 1
            continue
            
        nearest_node, dist = find_nearest_node(lat, lng, nodes)
        if not nearest_node:
            results["shelters"]["unresolved"] += 1
            continue
            
        comp_id = component_map[nearest_node["id"]]
        
        repo.upsert_network_access({
            "id": f"access_shelter_{sh['id']}",
            "entity_id": sh["id"],
            "entity_type": "SHELTER",
            "graph_node_id": nearest_node["id"],
            "access_distance_m": round(dist, 2),
            "component_id": comp_id,
            "is_operational": True,
            "connection_method": "NEAREST_GRAPH_NODE",
            "source_type": "DERIVED",
            "data_status": "DERIVED"
        })
        
        results["shelters"]["connected"] += 1
        results["shelters"]["distances"].append(dist)
        if comp_id == "LARGEST_COMPONENT":
            results["shelters"]["largest_cc"] += 1
        else:
            results["shelters"]["smaller_cc"] += 1

    print("\n--- CONNECTIVITY SUMMARY ---")
    for category in ["settlements", "shelters"]:
        stats = results[category]
        dists = stats["distances"]
        avg_dist = sum(dists) / len(dists) if dists else 0
        max_dist = max(dists) if dists else 0
        
        print(f"\n{category.upper()}:")
        print(f"Total records: {stats['total']}")
        print(f"Successfully connected: {stats['connected']}")
        print(f"Unresolved: {stats['unresolved']}")
        print(f"Connected to largest component: {stats['largest_cc']}")
        print(f"Connected to smaller component: {stats['smaller_cc']}")
        print(f"Average access distance: {avg_dist:.2f} m")
        print(f"Maximum access distance: {max_dist:.2f} m")

    return results

if __name__ == "__main__":
    connect_network_access()
