import os
import json
import psycopg2
from psycopg2.extras import DictCursor, Json

class Repository:
    def __init__(self, db_url=None):
        self.db_url = db_url or os.getenv("DATABASE_URL")
        self.in_memory = not bool(self.db_url)
        self.memory_store = {
            "habitations": {},
            "shelters": {},
            "resources": {},
            "observations": {}
        }
        
        if self.db_url:
            print(f"📦 Initializing PostgreSQL Database Connection...")
            self._init_db()
        else:
            print(f"⚠️ DATABASE_URL not set. Falling back to IN-MEMORY persistence.")

    def _get_conn(self):
        return psycopg2.connect(self.db_url, cursor_factory=DictCursor)

    def _init_db(self):
        try:
            with self._get_conn() as conn:
                with conn.cursor() as cur:
                    # Shelters Table
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS shelters (
                            id VARCHAR(50) PRIMARY KEY,
                            name VARCHAR(255),
                            code VARCHAR(50),
                            lat FLOAT,
                            lng FLOAT,
                            capacity INT,
                            occupied INT,
                            available INT,
                            type VARCHAR(255),
                            elevation VARCHAR(255),
                            water_stock_liters INT,
                            food_meals_stock INT,
                            medical_teams INT,
                            power_generators INT,
                            status VARCHAR(100),
                            contact VARCHAR(255)
                        )
                    """)
                    
                    # Habitations Table
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS habitations (
                            id VARCHAR(50) PRIMARY KEY,
                            name VARCHAR(255),
                            code VARCHAR(50),
                            district VARCHAR(100),
                            region VARCHAR(100),
                            lat FLOAT,
                            lng FLOAT,
                            population INT,
                            affected_population INT,
                            elderly INT,
                            children INT,
                            medical_priority INT,
                            hazard_type VARCHAR(100),
                            hazard_level VARCHAR(100),
                            assigned_shelter_id VARCHAR(50) REFERENCES shelters(id),
                            distance_to_shelter_km FLOAT,
                            relocation_status VARCHAR(100),
                            evacuation_progress INT,
                            road_condition VARCHAR(255),
                            priority VARCHAR(100),
                            response_status VARCHAR(100)
                        )
                    """)

                    # Hazard Details Table (1:1 with habitations)
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS hazard_details (
                            habitation_id VARCHAR(50) PRIMARY KEY REFERENCES habitations(id),
                            slope_index VARCHAR(100),
                            elevation VARCHAR(100),
                            river_proximity VARCHAR(100),
                            flood_risk VARCHAR(50),
                            landslide_risk VARCHAR(50)
                        )
                    """)

                    # Resources Table (single row or key/value)
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS resources (
                            id VARCHAR(50) PRIMARY KEY,
                            data JSONB
                        )
                    """)

                    # Environmental Observations Table (Real baseline disaster data)
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS environmental_observations (
                            id VARCHAR(50) PRIMARY KEY,
                            station_name VARCHAR(255),
                            district VARCHAR(100),
                            river_basin VARCHAR(100),
                            lat FLOAT,
                            lng FLOAT,
                            elevation_m FLOAT,
                            parameter_name VARCHAR(100),
                            parameter_value FLOAT,
                            parameter_unit VARCHAR(20),
                            observation_time TIMESTAMP,
                            ingestion_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            source_name VARCHAR(100),
                            source_url VARCHAR(255),
                            source_dataset VARCHAR(100),
                            source_type VARCHAR(50),
                            data_status VARCHAR(50) DEFAULT 'REAL'
                        )
                    """)
                conn.commit()
        except Exception as e:
            print(f"❌ Failed to initialize database schema: {e}")
            self.in_memory = True
            print("⚠️ Falling back to IN-MEMORY persistence due to DB error.")

    def seed_data(self, habitations, shelters, resources):
        if self.in_memory:
            for s in shelters:
                self.memory_store["shelters"][s["id"]] = dict(s)
            for h in habitations:
                self.memory_store["habitations"][h["id"]] = dict(h)
            self.memory_store["resources"]["default"] = dict(resources)
            return

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                # Check if seeded
                cur.execute("SELECT COUNT(*) FROM shelters")
                if cur.fetchone()[0] > 0:
                    return

                # Seed Shelters
                for s in shelters:
                    cur.execute("""
                        INSERT INTO shelters (id, name, code, lat, lng, capacity, occupied, available, type, elevation, water_stock_liters, food_meals_stock, medical_teams, power_generators, status, contact)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (s.get("id"), s.get("name"), s.get("code"), s.get("lat"), s.get("lng"), s.get("capacity"), s.get("occupied"), s.get("available"), s.get("type"), s.get("elevation"), s.get("waterStockLiters"), s.get("foodMealsStock"), s.get("medicalTeams"), s.get("powerGenerators"), s.get("status"), s.get("contact")))

                # Seed Habitations & Hazard Details
                for h in habitations:
                    cur.execute("""
                        INSERT INTO habitations (id, name, code, district, region, lat, lng, population, affected_population, elderly, children, medical_priority, hazard_type, hazard_level, assigned_shelter_id, distance_to_shelter_km, relocation_status, evacuation_progress, road_condition, priority, response_status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (h.get("id"), h.get("name"), h.get("code"), h.get("district"), h.get("region"), h.get("lat"), h.get("lng"), h.get("population"), h.get("affectedPopulation"), h.get("elderly"), h.get("children"), h.get("medicalPriority"), h.get("hazardType"), h.get("hazardLevel"), h.get("assignedShelterId"), h.get("distanceToShelterKm"), h.get("relocationStatus"), h.get("evacuationProgress"), h.get("roadCondition"), h.get("priority"), h.get("responseStatus")))

                    hd = h.get("hazardDetails", {})
                    cur.execute("""
                        INSERT INTO hazard_details (habitation_id, slope_index, elevation, river_proximity, flood_risk, landslide_risk)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (h.get("id"), hd.get("slopeIndex"), hd.get("elevation"), hd.get("riverProximity"), hd.get("floodRisk"), hd.get("landslideRisk")))

                # Seed Resources
                cur.execute("INSERT INTO resources (id, data) VALUES (%s, %s)", ("default", Json(resources)))
                
            conn.commit()

    def get_all_shelters(self):
        if self.in_memory:
            return list(self.memory_store["shelters"].values())

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM shelters")
                rows = cur.fetchall()
                res = []
                for r in rows:
                    res.append({
                        "id": r["id"],
                        "name": r["name"],
                        "code": r["code"],
                        "lat": r["lat"],
                        "lng": r["lng"],
                        "capacity": r["capacity"],
                        "occupied": r["occupied"],
                        "available": r["available"],
                        "type": r["type"],
                        "elevation": r["elevation"],
                        "waterStockLiters": r["water_stock_liters"],
                        "foodMealsStock": r["food_meals_stock"],
                        "medicalTeams": r["medical_teams"],
                        "powerGenerators": r["power_generators"],
                        "status": r["status"],
                        "contact": r["contact"]
                    })
                return res

    def get_all_habitations(self):
        if self.in_memory:
            return list(self.memory_store["habitations"].values())

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT h.*, hd.slope_index, hd.elevation as hd_elevation, hd.river_proximity, hd.flood_risk, hd.landslide_risk
                    FROM habitations h
                    LEFT JOIN hazard_details hd ON h.id = hd.habitation_id
                """)
                rows = cur.fetchall()
                res = []
                for r in rows:
                    res.append({
                        "id": r["id"],
                        "name": r["name"],
                        "code": r["code"],
                        "district": r["district"],
                        "region": r["region"],
                        "lat": r["lat"],
                        "lng": r["lng"],
                        "population": r["population"],
                        "affectedPopulation": r["affected_population"],
                        "elderly": r["elderly"],
                        "children": r["children"],
                        "medicalPriority": r["medical_priority"],
                        "hazardType": r["hazard_type"],
                        "hazardLevel": r["hazard_level"],
                        "assignedShelterId": r["assigned_shelter_id"],
                        "distanceToShelterKm": r["distance_to_shelter_km"],
                        "relocationStatus": r["relocation_status"],
                        "evacuationProgress": r["evacuation_progress"],
                        "roadCondition": r["road_condition"],
                        "priority": r["priority"],
                        "responseStatus": r["response_status"],
                        "hazardDetails": {
                            "slopeIndex": r["slope_index"],
                            "elevation": r["hd_elevation"],
                            "riverProximity": r["river_proximity"],
                            "floodRisk": r["flood_risk"],
                            "landslideRisk": r["landslide_risk"]
                        }
                    })
                return res

    def get_resources(self):
        if self.in_memory:
            return self.memory_store["resources"].get("default", {})

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT data FROM resources WHERE id = 'default'")
                row = cur.fetchone()
                return row[0] if row else {}

    def update_habitation_relocation(self, area_id, status, progress=None, assigned_shelter_id=None):
        if self.in_memory:
            hab = self.memory_store["habitations"].get(area_id)
            if not hab:
                return None
            hab["relocationStatus"] = status
            if assigned_shelter_id:
                hab["assignedShelterId"] = assigned_shelter_id
            if progress is not None:
                hab["evacuationProgress"] = min(100, max(0, int(progress)))
            elif status.lower() == "completed":
                hab["evacuationProgress"] = 100
            elif status.lower() == "in progress":
                hab["evacuationProgress"] = max(hab.get("evacuationProgress", 0), 50)
            return hab

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                # Fetch current progress
                cur.execute("SELECT evacuation_progress FROM habitations WHERE id = %s", (area_id,))
                row = cur.fetchone()
                if not row:
                    return None
                
                curr_progress = row[0]
                new_progress = curr_progress
                if progress is not None:
                    new_progress = min(100, max(0, int(progress)))
                elif status.lower() == "completed":
                    new_progress = 100
                elif status.lower() == "in progress":
                    new_progress = max(curr_progress or 0, 50)

                updates = ["relocation_status = %s", "evacuation_progress = %s"]
                params = [status, new_progress]
                if assigned_shelter_id:
                    updates.append("assigned_shelter_id = %s")
                    params.append(assigned_shelter_id)
                
                params.append(area_id)
                
                query = f"UPDATE habitations SET {', '.join(updates)} WHERE id = %s"
                cur.execute(query, tuple(params))
            conn.commit()

        # Fetch the updated one to return
        all_habs = self.get_all_habitations()
        for h in all_habs:
            if h["id"] == area_id:
                return h
        return None

    def _format_observation(self, r):
        obs_time = str(r["observation_time"]) if r.get("observation_time") is not None else None
        ing_time = str(r["ingestion_time"]) if r.get("ingestion_time") is not None else None
        return {
            "id": r["id"],
            "station_name": r["station_name"],
            "stationName": r["station_name"],
            "district": r["district"],
            "river_basin": r["river_basin"],
            "riverBasin": r["river_basin"],
            "lat": r["lat"],
            "lng": r["lng"],
            "elevation_m": r["elevation_m"],
            "elevationM": r["elevation_m"],
            "parameter_name": r["parameter_name"],
            "parameterName": r["parameter_name"],
            "parameter_value": r["parameter_value"],
            "parameterValue": r["parameter_value"],
            "parameter_unit": r["parameter_unit"],
            "parameterUnit": r["parameter_unit"],
            "observation_time": obs_time,
            "observationTime": obs_time,
            "ingestion_time": ing_time,
            "ingestionTime": ing_time,
            "source_name": r["source_name"],
            "sourceName": r["source_name"],
            "source_url": r["source_url"],
            "sourceUrl": r["source_url"],
            "source_dataset": r["source_dataset"],
            "sourceDataset": r["source_dataset"],
            "source_type": r["source_type"],
            "sourceType": r["source_type"],
            "data_status": r["data_status"],
            "dataStatus": r["data_status"]
        }

    def upsert_observation(self, obs):
        if not isinstance(obs, dict) or not obs.get("id"):
            raise ValueError("Observation record must be a dict containing a unique 'id' field.")

        formatted = {
            "id": obs["id"],
            "station_name": obs.get("station_name") or obs.get("stationName"),
            "district": obs.get("district"),
            "river_basin": obs.get("river_basin") or obs.get("riverBasin"),
            "lat": obs.get("lat"),
            "lng": obs.get("lng"),
            "elevation_m": obs.get("elevation_m") or obs.get("elevationM"),
            "parameter_name": obs.get("parameter_name") or obs.get("parameterName"),
            "parameter_value": obs.get("parameter_value") or obs.get("parameterValue"),
            "parameter_unit": obs.get("parameter_unit") or obs.get("parameterUnit"),
            "observation_time": obs.get("observation_time") or obs.get("observationTime"),
            "ingestion_time": obs.get("ingestion_time") or obs.get("ingestionTime"),
            "source_name": obs.get("source_name") or obs.get("sourceName"),
            "source_url": obs.get("source_url") or obs.get("sourceUrl"),
            "source_dataset": obs.get("source_dataset") or obs.get("sourceDataset"),
            "source_type": obs.get("source_type") or obs.get("sourceType"),
            "data_status": obs.get("data_status") or obs.get("dataStatus") or "REAL"
        }

        # Dual mapping keys for in-memory store
        formatted["stationName"] = formatted["station_name"]
        formatted["riverBasin"] = formatted["river_basin"]
        formatted["elevationM"] = formatted["elevation_m"]
        formatted["parameterName"] = formatted["parameter_name"]
        formatted["parameterValue"] = formatted["parameter_value"]
        formatted["parameterUnit"] = formatted["parameter_unit"]
        formatted["observationTime"] = formatted["observation_time"]
        formatted["ingestionTime"] = formatted["ingestion_time"]
        formatted["sourceName"] = formatted["source_name"]
        formatted["sourceUrl"] = formatted["source_url"]
        formatted["sourceDataset"] = formatted["source_dataset"]
        formatted["sourceType"] = formatted["source_type"]
        formatted["dataStatus"] = formatted["data_status"]

        if self.in_memory:
            self.memory_store["observations"][obs["id"]] = formatted
            return dict(formatted)

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO environmental_observations (
                        id, station_name, district, river_basin, lat, lng, elevation_m,
                        parameter_name, parameter_value, parameter_unit, observation_time,
                        source_name, source_url, source_dataset, source_type, data_status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        station_name = EXCLUDED.station_name,
                        district = EXCLUDED.district,
                        river_basin = EXCLUDED.river_basin,
                        lat = EXCLUDED.lat,
                        lng = EXCLUDED.lng,
                        elevation_m = EXCLUDED.elevation_m,
                        parameter_name = EXCLUDED.parameter_name,
                        parameter_value = EXCLUDED.parameter_value,
                        parameter_unit = EXCLUDED.parameter_unit,
                        observation_time = EXCLUDED.observation_time,
                        source_name = EXCLUDED.source_name,
                        source_url = EXCLUDED.source_url,
                        source_dataset = EXCLUDED.source_dataset,
                        source_type = EXCLUDED.source_type,
                        data_status = EXCLUDED.data_status
                """, (
                    formatted["id"], formatted["station_name"], formatted["district"], formatted["river_basin"],
                    formatted["lat"], formatted["lng"], formatted["elevation_m"], formatted["parameter_name"],
                    formatted["parameter_value"], formatted["parameter_unit"], formatted["observation_time"],
                    formatted["source_name"], formatted["source_url"], formatted["source_dataset"],
                    formatted["source_type"], formatted["data_status"]
                ))
            conn.commit()
        return dict(formatted)

    def save_observation(self, obs):
        return self.upsert_observation(obs)

    def get_observations(self, district=None, parameter_name=None):
        if self.in_memory:
            res = list(self.memory_store["observations"].values())
            if district:
                res = [o for o in res if (o.get("district") or "").strip().lower() == district.strip().lower()]
            if parameter_name:
                res = [
                    o for o in res
                    if (o.get("parameter_name") or o.get("parameterName") or "").strip().lower() == parameter_name.strip().lower()
                ]
            return [dict(o) for o in res]

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                query = "SELECT * FROM environmental_observations WHERE 1=1"
                params = []
                if district:
                    query += " AND LOWER(district) = LOWER(%s)"
                    params.append(district.strip())
                if parameter_name:
                    query += " AND LOWER(parameter_name) = LOWER(%s)"
                    params.append(parameter_name.strip())
                query += " ORDER BY id ASC"
                cur.execute(query, tuple(params))
                rows = cur.fetchall()
                return [self._format_observation(r) for r in rows]

    def get_observations_by_district(self, district):
        return self.get_observations(district=district)

    def get_observations_by_parameter(self, parameter_name):
        return self.get_observations(parameter_name=parameter_name)

# Singleton repository
repo = Repository()
