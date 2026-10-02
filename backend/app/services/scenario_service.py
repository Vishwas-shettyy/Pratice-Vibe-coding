import math
import hashlib
from datetime import datetime, timezone
from app.services.repository import repo
import json

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

class ScenarioService:
    BASELINE_SCENARIO_ID = "KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO"
    HARSH_SCENARIO_ID = "KODAGU_EXTREME_MONSOON_HARSH_CASE"

    def __init__(self, repository=None):
        self.repo = repository or repo
        
    def get_or_create_default_scenario(self):
        scenario_id = self.BASELINE_SCENARIO_ID
        existing = self.repo.get_scenario(scenario_id)
        if not existing:
            scenario = {
                "id": scenario_id,
                "name": "Kodagu Monsoon Flood and Landslide (Simulated)",
                "label": "BASELINE SCENARIO",
                "type": "MONSOON_DISASTER",
                "description": "A controlled simulation of extreme monsoon rainfall leading to localized flooding near river gauges and landslides near steep terrain features.",
                "rainfall_24h_mm": 250.0,
                "river_stage_m": 45.0,
                "flood_influence_radius_km": 3.0,
                "landslide_influence_radius_km": 5.0,
                "landslide_rainfall_trigger_mm": 150.0,
                "affected_road_fraction": 0.15,
                "severity": "CRITICAL",
                "data_status": "SCENARIO",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            existing = self.repo.upsert_scenario(scenario)
        self.get_or_create_harsh_scenario()
        return existing

    def get_or_create_harsh_scenario(self):
        scenario_id = self.HARSH_SCENARIO_ID
        existing = self.repo.get_scenario(scenario_id)
        if existing:
            return existing

        scenario = {
            "id": scenario_id,
            "name": "Kodagu Extreme Monsoon & Severe Landslide (Harsh Simulation)",
            "label": "HARSH CASE",
            "type": "MONSOON_DISASTER",
            "description": "Deterministic extreme flood and landslide stress simulation using the real Kodagu dataset and network.",
            "rainfall_24h_mm": 450.0,
            "river_stage_m": 65.0,
            "flood_influence_radius_km": 10.0,
            "landslide_influence_radius_km": 15.0,
            "landslide_rainfall_trigger_mm": 120.0,
            "affected_road_fraction": 0.45,
            "severity": "CRITICAL",
            "data_status": "SCENARIO",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        return self.repo.upsert_scenario(scenario)
        
    def run_scenario(self, scenario_id):
        scenario = self.repo.get_scenario(scenario_id)
        if not scenario:
            if scenario_id == self.HARSH_SCENARIO_ID:
                scenario = self.get_or_create_harsh_scenario()
            elif scenario_id == self.BASELINE_SCENARIO_ID:
                scenario = self.get_or_create_default_scenario()
            else:
                raise ValueError("Scenario not found")
            
        try:
            with open("backend/data/real_observations_karnataka.json", "r") as f:
                observations = json.load(f)
        except Exception:
            observations = []

        habitations = self.repo.get_all_habitations()
        is_real_kodagu = any(str(h.get("id", "")).startswith("SET-KOD-") for h in habitations)
        if is_real_kodagu:
            if not self.repo.get_all_facilities():
                try:
                    from scripts.ingest_osm_facilities import ingest_osm_facilities
                    ingest_osm_facilities(self.repo)
                except Exception:
                    pass
            if not self.repo.get_all_roads():
                try:
                    from scripts.ingest_osm_roads import ingest_osm_roads
                    ingest_osm_roads(self.repo)
                except Exception:
                    pass

        facilities = self.repo.get_all_facilities()
        roads = self.repo.get_all_roads()
        
        count_exposures = 0
        count_roads = 0
        
        flood_rad = scenario["flood_influence_radius_km"] * 1000
        land_rad = scenario["landslide_influence_radius_km"] * 1000
        
        for hab in habitations:
            self._evaluate_entity_exposure(scenario, hab["id"], "SETTLEMENT", hab.get("lat"), hab.get("lng"), observations, flood_rad, land_rad)
            count_exposures += 1
            
        for fac in facilities:
            self._evaluate_entity_exposure(scenario, fac["id"], "FACILITY", fac.get("lat"), fac.get("lng"), observations, flood_rad, land_rad)
            count_exposures += 1
            
        frac = scenario["affected_road_fraction"]
        for road in roads:
            # Deterministic pseudo-random using hash of road id and scenario id
            h = hashlib.sha256(f"{scenario_id}_{road['id']}".encode('utf-8')).hexdigest()
            # use first 4 hex chars as an integer modulo 100 to get a stable 0-99 distribution
            val = int(h[:4], 16) % 100
            
            if val < (frac * 100):
                status = "BLOCKED" if val < (frac * 50) else "RESTRICTED"
                reason = f"SCENARIO: Road falls within simulated closure radius (Hash threshold {val} < {frac*100})"
            else:
                status = "OPEN"
                reason = "SCENARIO: Simulated as unaffected."
                
            imp = {
                "id": f"sri_{scenario_id}_{road['id']}",
                "scenario_id": scenario_id,
                "road_id": road['id'],
                "impact_status": status,
                "impact_reason": reason,
                "data_status": "SCENARIO"
            }
            self.repo.upsert_scenario_road_impact(imp)
            count_roads += 1
            
        return {"exposures_calculated": count_exposures, "roads_evaluated": count_roads}
        
    def _evaluate_entity_exposure(self, scenario, entity_id, entity_type, lat, lng, observations, flood_rad, land_rad):
        min_dist = float('inf')
        for obs in observations:
            obs_lat = obs.get("lat")
            obs_lng = obs.get("lng")
            dist = calculate_distance(lat, lng, obs_lat, obs_lng)
            if dist < min_dist:
                min_dist = dist
                
        flood_exposure = "LOW"
        landslide_exposure = "LOW"
        reasons = []
        
        if min_dist <= flood_rad:
            flood_exposure = "HIGH"
            reasons.append(f"SCENARIO: Entity lies within configured {scenario['flood_influence_radius_km']} km flood influence radius under the Kodagu monsoon scenario.")
            
        if min_dist <= land_rad and scenario["rainfall_24h_mm"] >= scenario["landslide_rainfall_trigger_mm"]:
            landslide_exposure = "HIGH"
            reasons.append(f"SCENARIO: Entity lies within configured {scenario['landslide_influence_radius_km']} km landslide influence radius triggered by {scenario['rainfall_24h_mm']}mm rain assumption.")
            
        if not reasons:
            reasons.append("SCENARIO: Beyond immediate simulated hazard radius.")
            overall = "LOW"
        else:
            overall = "HIGH"
            
        exp = {
            "id": f"se_{scenario['id']}_{entity_type}_{entity_id}",
            "scenario_id": scenario["id"],
            "entity_id": entity_id,
            "entity_type": entity_type,
            "flood_exposure": flood_exposure,
            "landslide_exposure": landslide_exposure,
            "overall_exposure": overall,
            "impact_reason": " | ".join(reasons),
            "data_status": "SCENARIO"
        }
        self.repo.upsert_scenario_exposure(exp)

scenario_service = ScenarioService()
