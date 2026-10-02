from datetime import datetime, timezone
from app.services.repository import repo
from app.services.routing_service import routing_service
import math

def calculate_distance(lat1, lon1, lat2, lon2):
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')
    R = 6371e3
    phi1 = lat1 * math.pi/180
    phi2 = lat2 * math.pi/180
    delta_phi = (lat2 - lat1) * math.pi/180
    delta_lambda = (lon2 - lon1) * math.pi/180

    a = math.sin(delta_phi/2) * math.sin(delta_phi/2) + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda/2) * math.sin(delta_lambda/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

class RelocationService:
    def __init__(self, repository=None):
        self.repo = repository or repo
        
    def run_scenario_relocation(self, scenario_id):
        habitations = self.repo.get_all_habitations()
        is_real_kodagu = any(str(h.get("id", "")).startswith("SET-KOD-") for h in habitations)
        if is_real_kodagu:
            if not self.repo.get_all_facilities():
                try:
                    from scripts.ingest_osm_facilities import ingest_osm_facilities
                    ingest_osm_facilities(self.repo)
                except Exception:
                    pass
            if not self.repo.get_all_safe_site_operations():
                try:
                    from app.services.safe_site_service import safe_site_service
                    safe_site_service.repo = self.repo
                    safe_site_service.initialize_deterministic_operations()
                except Exception:
                    pass
            if not self.repo.get_all_graph_nodes():
                try:
                    from scripts.build_routing_graph import build_routing_graph
                    build_routing_graph(self.repo)
                except Exception:
                    pass
            if not self.repo.get_all_network_access():
                try:
                    from scripts.connect_network_access import connect_network_access
                    connect_network_access(self.repo)
                except Exception:
                    pass

        facilities = self.repo.get_all_facilities()
        safe_ops = {op["facility_id"]: op for op in self.repo.get_all_safe_site_operations()}
        exposures = {exp["entity_id"]: exp for exp in self.repo.get_scenario_exposures(scenario_id)}
        network_access = self.repo.get_all_network_access()
        access_map = {acc["entity_id"]: acc for acc in network_access}
        nodes = self.repo.get_all_graph_nodes()
        
        results = []
        for hab in habitations:
            result = self._process_settlement(
                scenario_id, hab, facilities, safe_ops, exposures, access_map, nodes
            )
            if result:
                results.append(result)
                self.repo.upsert_scenario_relocation(result)
        return results

    def _get_nearest_node(self, lat, lng, nodes):
        min_dist = float('inf')
        nearest = None
        for node in nodes:
            d = calculate_distance(lat, lng, node["lat"], node["lng"])
            if d < min_dist:
                min_dist = d
                nearest = node
        return nearest

    def _process_settlement(self, scenario_id, hab, facilities, safe_ops, exposures, access_map, nodes):
        hab_exp = exposures.get(hab["id"], {})
        overall_exp = hab_exp.get("overall_exposure", "UNKNOWN")
        
        # Priority rules
        # If overall exposure is HIGH -> CRITICAL
        # If UNKNOWN/LOW -> MODERATE
        # Population is explicitly unknown in current dataset
        pop = hab.get("population")
        
        if overall_exp == "HIGH":
            priority = "CRITICAL"
        else:
            priority = "MODERATE"
            
        hab_node_id = None
        if hab["id"] in access_map:
            hab_node_id = access_map[hab["id"]]["graph_node_id"]
        else:
            nearest = self._get_nearest_node(hab.get("lat"), hab.get("lng"), nodes)
            if nearest: hab_node_id = nearest["id"]
            
        if not hab_node_id:
            return self._build_result(scenario_id, hab, priority, pop, None, "NO_ROUTE", "No graph node available near settlement.", 0, geometry=None)
            
        candidates = []
        
        for fac in facilities:
            op = safe_ops.get(fac["id"])
            if not op:
                continue
                
            fac_exp = exposures.get(fac["id"], {})
            if fac_exp.get("overall_exposure") == "HIGH":
                continue # rejected: scenario hazard exposure is HIGH
                
            if op.get("operational_status") == "CLOSED":
                continue # rejected: CLOSED
                
            avail = op.get("available_capacity", 0)
            if avail <= 0:
                continue # rejected: no capacity
                
            fac_node_id = None
            if fac["id"] in access_map:
                fac_node_id = access_map[fac["id"]]["graph_node_id"]
            else:
                nearest = self._get_nearest_node(fac.get("lat"), fac.get("lng"), nodes)
                if nearest: fac_node_id = nearest["id"]
                
            if not fac_node_id:
                continue
                
            # Try routing
            route = routing_service.find_shortest_path(hab_node_id, fac_node_id, scenario_id)
            if route["status"] != "SUCCESS":
                continue
                
            candidates.append({
                "facility": fac,
                "op": op,
                "route": route
            })
            
        candidate_count = len(candidates)
        
        if not candidates:
            return self._build_result(scenario_id, hab, priority, pop, None, "NO_ROUTE", "No suitable destination exists. Filtered by capacity, operational status, hazard, or blocked routes.", candidate_count, geometry=None)
            
        # Select best candidate (shortest travel time)
        candidates.sort(key=lambda x: x["route"].get("estimated_travel_time_min", 0.0))
        best = candidates[0]
        
        fac = best["facility"]
        op = best["op"]
        route = best["route"]
        
        req_cap = pop
        avail_cap = op["available_capacity"]
        
        if req_cap is None:
            cap_status = "UNKNOWN_REQUIREMENT (SCENARIO ASSUMPTION)"
        else:
            cap_status = "CAPACITY_SUFFICIENT"
            if avail_cap < req_cap:
                cap_status = "CAPACITY_INSUFFICIENT"
            
        pop_str = f"{req_cap} affected residents" if req_cap is not None else "an unknown number of residents (SCENARIO ASSUMPTION)"
        reason = f"SCENARIO: {priority} priority because scenario exposure is {overall_exp} and the settlement has {pop_str}. Facility '{fac['name']}' selected because it has {avail_cap} available scenario spaces and a {route['distance_km']} km accessible route."
        
        return self._build_result(
            scenario_id, hab, priority, req_cap, fac["id"], route["status"], reason, candidate_count,
            avail_cap, cap_status, route["distance_m"], route["estimated_travel_time_min"], route.get("geometry")
        )

    def _build_result(self, scenario_id, hab, priority, req_cap, rec_site_id, route_status, reason, cand_count,
                      avail_cap=0, cap_status="N/A", dist_m=0.0, time_min=0.0, geometry=None):
        return {
            "id": f"srel_{scenario_id}_{hab['id']}",
            "scenario_id": scenario_id,
            "settlement_id": hab["id"],
            "recommended_site_id": rec_site_id,
            "priority": priority,
            "required_capacity": req_cap,
            "available_capacity": avail_cap,
            "capacity_status": cap_status,
            "route_status": route_status,
            "route_distance_m": dist_m,
            "estimated_travel_time_min": time_min,
            "candidate_count": cand_count,
            "recommendation_reason": reason,
            "route_geometry": geometry,
            "data_status": "SCENARIO",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

relocation_service = RelocationService()
