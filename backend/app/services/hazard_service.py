from datetime import datetime, timezone
import math
from app.services.repository import repo
import json

def calculate_distance(lat1, lon1, lat2, lon2):
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

class HazardService:
    def __init__(self, repository=None):
        self.repo = repository or repo
        
    def assess_all_entities(self):
        # We don't have a direct method to get observations in repo yet, so we load from the raw file for proximity checks
        try:
            with open("backend/data/real_observations_karnataka.json", "r") as f:
                observations = json.load(f)
        except Exception:
            observations = []

        habitations = self.repo.get_all_habitations()
        facilities = self.repo.get_all_facilities()
        
        count = 0
        for s in habitations:
            self._assess_entity(s["id"], "SETTLEMENT", s.get("lat"), s.get("lng"), observations)
            count += 1
            
        for f in facilities:
            self._assess_entity(f["id"], "FACILITY", f.get("lat"), f.get("lng"), observations)
            count += 1
            
        return count

    def _assess_entity(self, entity_id, entity_type, lat, lng, observations):
        # Check proximity to observations for evidence
        nearest_obs = None
        min_dist = float('inf')
        
        if lat is not None and lng is not None:
            for obs in observations:
                obs_lat = obs.get("lat")
                obs_lng = obs.get("lng")
                if obs_lat is not None and obs_lng is not None:
                    dist = calculate_distance(lat, lng, obs_lat, obs_lng)
                    if dist < min_dist:
                        min_dist = dist
                        nearest_obs = obs
        
        evidence_parts = []
        if nearest_obs:
            dist_km = min_dist / 1000.0
            val = nearest_obs.get("parameter_value")
            unit = nearest_obs.get("parameter_unit")
            name = nearest_obs.get("station_name")
            evidence_parts.append(f"Nearest observation: {name} at {dist_km:.2f}km ({val} {unit})")
        else:
            evidence_parts.append("No nearby hydro-meteorological observations available")
            
        evidence_parts.append("Lacks site-specific river inundation map and DEM slope/susceptibility data")
        evidence = " | ".join(evidence_parts)
        
        methodology = "Strict data constraint: Requires explicit geospatial hazard overlay (inundation, susceptibility map). Derived exposure is forced to UNKNOWN without authoritative layers."
        
        exp = {
            "id": f"hazard_{entity_type.lower()}_{entity_id}",
            "entity_id": entity_id,
            "entity_type": entity_type,
            "flood_exposure": "UNKNOWN",
            "landslide_exposure": "UNKNOWN",
            "overall_exposure": "UNKNOWN",
            "evidence": evidence,
            "methodology": methodology,
            "data_status": "DERIVED",
            "assessed_at": datetime.now(timezone.utc).isoformat()
        }
        
        self.repo.upsert_hazard_exposure(exp)

    def get_all_hazard_exposures(self):
        exposures = self.repo.get_all_hazard_exposures()
        
        facs = {f["id"]: f for f in self.repo.get_all_facilities()}
        sets = {s["id"]: s for s in self.repo.get_all_habitations()}
        
        results = []
        for exp in exposures:
            entity = None
            if exp["entity_type"] == "FACILITY":
                entity = facs.get(exp["entity_id"])
            elif exp["entity_type"] == "SETTLEMENT":
                entity = sets.get(exp["entity_id"])
                
            if entity:
                results.append({
                    "entity": entity,
                    "hazard_exposure": exp
                })
        return results

    def get_hazard_exposure(self, entity_type, entity_id):
        all_exps = self.get_all_hazard_exposures()
        for res in all_exps:
            if res["hazard_exposure"]["entity_type"] == entity_type and res["hazard_exposure"]["entity_id"] == entity_id:
                return res
        return None

hazard_service = HazardService()
