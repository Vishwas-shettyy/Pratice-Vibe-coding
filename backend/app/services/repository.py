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
            "observations": {},
            "roads": {},
            "graph_nodes": {},
            "graph_edges": {},
            "network_access": {},
            "facilities": {},
            "safe_site_operations": {},
            "hazard_exposures": {},
            "scenarios": {},
            "scenario_exposures": {},
            "scenario_road_impacts": {},
            "scenario_relocations": {}
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
                            region_type VARCHAR(50) DEFAULT 'RESQ_DERIVED',
                            taluk VARCHAR(100),
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
                            response_status VARCHAR(100),
                            source_name VARCHAR(100),
                            source_url VARCHAR(255),
                            source_dataset VARCHAR(100),
                            source_type VARCHAR(50),
                            coordinate_source_name VARCHAR(100),
                            coordinate_source_url VARCHAR(255),
                            coordinate_source_dataset VARCHAR(100),
                            coordinate_source_type VARCHAR(50),
                            data_status VARCHAR(50) DEFAULT 'DEMO'
                        )
                    """)
                    # Ensure additive columns exist on pre-existing tables
                    cur.execute("ALTER TABLE habitations ADD COLUMN IF NOT EXISTS region_type VARCHAR(50) DEFAULT 'RESQ_DERIVED';")
                    cur.execute("ALTER TABLE habitations ADD COLUMN IF NOT EXISTS coordinate_source_name VARCHAR(100);")
                    cur.execute("ALTER TABLE habitations ADD COLUMN IF NOT EXISTS coordinate_source_url VARCHAR(255);")
                    cur.execute("ALTER TABLE habitations ADD COLUMN IF NOT EXISTS coordinate_source_dataset VARCHAR(100);")
                    cur.execute("ALTER TABLE habitations ADD COLUMN IF NOT EXISTS coordinate_source_type VARCHAR(50);")

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

                    # Roads Table
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS roads (
                            id VARCHAR(50) PRIMARY KEY,
                            name VARCHAR(255),
                            highway_class VARCHAR(100),
                            geometry JSONB,
                            surface VARCHAR(100),
                            bridge BOOLEAN,
                            is_oneway BOOLEAN,
                            access VARCHAR(100),
                            maxspeed VARCHAR(50),
                            source_name VARCHAR(100),
                            source_url VARCHAR(255),
                            source_dataset VARCHAR(100),
                            source_type VARCHAR(50),
                            data_status VARCHAR(50) DEFAULT 'REAL',
                            observation_time TIMESTAMP
                        )
                    """)

                    # Graph Nodes Table
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS graph_nodes (
                            id VARCHAR(50) PRIMARY KEY,
                            lat FLOAT,
                            lng FLOAT,
                            source_name VARCHAR(100),
                            source_type VARCHAR(50),
                            data_status VARCHAR(50) DEFAULT 'REAL'
                        )
                    """)

                    # Graph Edges Table
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS graph_edges (
                            id VARCHAR(50) PRIMARY KEY,
                            from_node VARCHAR(50) REFERENCES graph_nodes(id),
                            to_node VARCHAR(50) REFERENCES graph_nodes(id),
                            osm_way_id VARCHAR(50),
                            name VARCHAR(255),
                            highway_class VARCHAR(100),
                            geometry JSONB,
                            length_m FLOAT,
                            surface VARCHAR(100),
                            bridge BOOLEAN,
                            is_oneway BOOLEAN,
                            access VARCHAR(100),
                            maxspeed VARCHAR(50),
                            source_name VARCHAR(100),
                            source_type VARCHAR(50),
                            data_status VARCHAR(50) DEFAULT 'REAL'
                        )
                    """)

                    # Network Access Table (Derived Relationship)
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS network_access (
                            id VARCHAR(100) PRIMARY KEY,
                            entity_id VARCHAR(50),
                            entity_type VARCHAR(50),
                            graph_node_id VARCHAR(50) REFERENCES graph_nodes(id),
                            access_distance_m FLOAT,
                            component_id VARCHAR(50),
                            is_operational BOOLEAN,
                            connection_method VARCHAR(100),
                            source_type VARCHAR(50) DEFAULT 'DERIVED',
                            data_status VARCHAR(50) DEFAULT 'DERIVED'
                        )
                    """)

                    # Facilities Table (REAL PHYSICAL CANDIDATES)
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS facilities (
                            id VARCHAR(50) PRIMARY KEY,
                            osm_element_id VARCHAR(50),
                            name VARCHAR(255),
                            district VARCHAR(100),
                            taluk VARCHAR(100),
                            lat FLOAT,
                            lng FLOAT,
                            facility_type VARCHAR(100),
                            source_name VARCHAR(100),
                            source_url VARCHAR(255),
                            source_dataset VARCHAR(100),
                            source_type VARCHAR(50),
                            data_status VARCHAR(50) DEFAULT 'REAL',
                            observation_time TIMESTAMP
                        )
                    """)

                    # Operational Safe-Site Scenarios
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS safe_site_operations (
                            id VARCHAR(50) PRIMARY KEY,
                            facility_id VARCHAR(50) REFERENCES facilities(id),
                            operational_status VARCHAR(50),
                            capacity INT,
                            occupancy INT,
                            available_capacity INT,
                            water_ready BOOLEAN,
                            food_ready BOOLEAN,
                            medical_ready BOOLEAN,
                            power_ready BOOLEAN,
                            accessibility_status VARCHAR(100),
                            suitability_score FLOAT,
                            suitability_level VARCHAR(50),
                            assessment_reason TEXT,
                            data_status VARCHAR(50) DEFAULT 'SCENARIO',
                            scenario_id VARCHAR(100),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)

                    # Hazard Exposures
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS hazard_exposures (
                            id VARCHAR(50) PRIMARY KEY,
                            entity_id VARCHAR(50),
                            entity_type VARCHAR(50),
                            flood_exposure VARCHAR(50),
                            landslide_exposure VARCHAR(50),
                            overall_exposure VARCHAR(50),
                            evidence TEXT,
                            methodology TEXT,
                            data_status VARCHAR(50) DEFAULT 'DERIVED',
                            assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)

                    # Scenarios
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS scenarios (
                            id VARCHAR(100) PRIMARY KEY,
                            name VARCHAR(255),
                            type VARCHAR(100),
                            description TEXT,
                            rainfall_24h_mm FLOAT,
                            river_stage_m FLOAT,
                            flood_influence_radius_km FLOAT,
                            landslide_influence_radius_km FLOAT,
                            landslide_rainfall_trigger_mm FLOAT,
                            affected_road_fraction FLOAT,
                            severity VARCHAR(50),
                            data_status VARCHAR(50) DEFAULT 'SCENARIO',
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS scenario_exposures (
                            id VARCHAR(255) PRIMARY KEY,
                            scenario_id VARCHAR(100),
                            entity_id VARCHAR(100),
                            entity_type VARCHAR(50),
                            flood_exposure VARCHAR(50),
                            landslide_exposure VARCHAR(50),
                            overall_exposure VARCHAR(50),
                            impact_reason TEXT,
                            data_status VARCHAR(50) DEFAULT 'SCENARIO'
                        )
                    """)
                    
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS scenario_road_impacts (
                            id VARCHAR(255) PRIMARY KEY,
                            scenario_id VARCHAR(100),
                            road_id VARCHAR(100),
                            impact_status VARCHAR(50),
                            impact_reason TEXT,
                            data_status VARCHAR(50) DEFAULT 'SCENARIO'
                        )
                    """)
                    
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS scenario_relocations (
                            id VARCHAR(255) PRIMARY KEY,
                            scenario_id VARCHAR(100),
                            settlement_id VARCHAR(100),
                            recommended_site_id VARCHAR(100),
                            priority VARCHAR(50),
                            required_capacity INTEGER,
                            available_capacity INTEGER,
                            capacity_status VARCHAR(50),
                            route_status VARCHAR(50),
                            route_distance_m FLOAT,
                            estimated_travel_time_min FLOAT,
                            candidate_count INTEGER,
                            recommendation_reason TEXT,
                            data_status VARCHAR(50) DEFAULT 'SCENARIO',
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    # Schema migrations for existing production tables
                    cur.execute("ALTER TABLE scenarios ALTER COLUMN id TYPE VARCHAR(100);")
                    cur.execute("ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS label VARCHAR(100);")

                    cur.execute("ALTER TABLE scenario_exposures ALTER COLUMN id TYPE VARCHAR(255);")
                    cur.execute("ALTER TABLE scenario_exposures ALTER COLUMN scenario_id TYPE VARCHAR(100);")
                    cur.execute("ALTER TABLE scenario_exposures ALTER COLUMN entity_id TYPE VARCHAR(100);")

                    cur.execute("ALTER TABLE scenario_road_impacts ALTER COLUMN id TYPE VARCHAR(255);")
                    cur.execute("ALTER TABLE scenario_road_impacts ALTER COLUMN scenario_id TYPE VARCHAR(100);")
                    cur.execute("ALTER TABLE scenario_road_impacts ALTER COLUMN road_id TYPE VARCHAR(100);")

                    cur.execute("ALTER TABLE scenario_relocations ALTER COLUMN id TYPE VARCHAR(255);")
                    cur.execute("ALTER TABLE scenario_relocations ALTER COLUMN scenario_id TYPE VARCHAR(100);")
                    cur.execute("ALTER TABLE scenario_relocations ALTER COLUMN settlement_id TYPE VARCHAR(100);")
                    cur.execute("ALTER TABLE scenario_relocations ALTER COLUMN recommended_site_id TYPE VARCHAR(100);")
                    cur.execute("ALTER TABLE scenario_relocations ADD COLUMN IF NOT EXISTS route_geometry JSONB;")
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
                        "taluk": r.get("taluk") if isinstance(r, dict) and "taluk" in r else None,
                        "lat": r["lat"],
                        "lng": r["lng"],
                        "population": r["population"],
                        "affectedPopulation": r["affected_population"],
                        "elderly": r["elderly"],
                        "children": r["children"],
                        "medicalPriority": r["medical_priority"],
                        "hazardType": r["hazard_type"] or "",
                        "hazardLevel": r["hazard_level"] or "",
                        "assignedShelterId": r["assigned_shelter_id"],
                        "distanceToShelterKm": r["distance_to_shelter_km"],
                        "relocationStatus": r["relocation_status"] or "",
                        "evacuationProgress": r["evacuation_progress"],
                        "roadCondition": r["road_condition"] or "",
                        "priority": r["priority"] or "",
                        "responseStatus": r["response_status"] or "",
                        "source_name": r.get("source_name") if isinstance(r, dict) and "source_name" in r else None,
                        "source_url": r.get("source_url") if isinstance(r, dict) and "source_url" in r else None,
                        "source_dataset": r.get("source_dataset") if isinstance(r, dict) and "source_dataset" in r else None,
                        "source_type": r.get("source_type") if isinstance(r, dict) and "source_type" in r else None,
                        "data_status": r.get("data_status") if isinstance(r, dict) and "data_status" in r else "DEMO",
                        "dataStatus": r.get("data_status") if isinstance(r, dict) and "data_status" in r else "DEMO",
                        "hazardDetails": {
                            "slopeIndex": r["slope_index"],
                            "elevation": r["hd_elevation"],
                            "riverProximity": r["river_proximity"],
                            "floodRisk": r["flood_risk"],
                            "landslideRisk": r["landslide_risk"]
                        }
                    })
                return res

    def upsert_habitation(self, hab):
        if not isinstance(hab, dict) or not hab.get("id"):
            raise ValueError("Habitation record must be a dict containing a unique 'id' field.")

        formatted = {
            "id": hab["id"],
            "name": hab.get("name"),
            "code": hab.get("code"),
            "district": hab.get("district"),
            "region": hab.get("region"),
            "taluk": hab.get("taluk"),
            "lat": hab.get("lat"),
            "lng": hab.get("lng"),
            "population": hab.get("population"),
            "affectedPopulation": hab.get("affectedPopulation") if hab.get("affectedPopulation") is not None else hab.get("affected_population"),
            "elderly": hab.get("elderly"),
            "children": hab.get("children"),
            "medicalPriority": hab.get("medicalPriority") if hab.get("medicalPriority") is not None else hab.get("medical_priority"),
            "hazardType": hab.get("hazardType") or hab.get("hazard_type") or "",
            "hazardLevel": hab.get("hazardLevel") or hab.get("hazard_level") or "",
            "assignedShelterId": hab.get("assignedShelterId") or hab.get("assigned_shelter_id"),
            "distanceToShelterKm": hab.get("distanceToShelterKm") if hab.get("distanceToShelterKm") is not None else hab.get("distance_to_shelter_km"),
            "relocationStatus": hab.get("relocationStatus") or hab.get("relocation_status") or "",
            "evacuationProgress": hab.get("evacuationProgress") if hab.get("evacuationProgress") is not None else hab.get("evacuation_progress"),
            "roadCondition": hab.get("roadCondition") or hab.get("road_condition") or "",
            "priority": hab.get("priority") or "",
            "responseStatus": hab.get("responseStatus") or hab.get("response_status") or "",
            "source_name": hab.get("source_name") or hab.get("sourceName"),
            "source_url": hab.get("source_url") or hab.get("sourceUrl"),
            "source_dataset": hab.get("source_dataset") or hab.get("sourceDataset"),
            "source_type": hab.get("source_type") or hab.get("sourceType"),
            "region_type": hab.get("region_type") or hab.get("regionType") or "RESQ_DERIVED",
            "coordinate_source_name": hab.get("coordinate_source_name") or hab.get("coordinateSourceName"),
            "coordinate_source_url": hab.get("coordinate_source_url") or hab.get("coordinateSourceUrl"),
            "coordinate_source_dataset": hab.get("coordinate_source_dataset") or hab.get("coordinateSourceDataset"),
            "coordinate_source_type": hab.get("coordinate_source_type") or hab.get("coordinateSourceType"),
            "data_status": hab.get("data_status") or hab.get("dataStatus") or "DEMO",
            "hazardDetails": hab.get("hazardDetails") or {}
        }
        formatted["dataStatus"] = formatted["data_status"]
        formatted["sourceName"] = formatted["source_name"]
        formatted["sourceUrl"] = formatted["source_url"]
        formatted["sourceDataset"] = formatted["source_dataset"]
        formatted["sourceType"] = formatted["source_type"]
        formatted["regionType"] = formatted["region_type"]
        formatted["coordinateSourceName"] = formatted["coordinate_source_name"]
        formatted["coordinateSourceUrl"] = formatted["coordinate_source_url"]
        formatted["coordinateSourceDataset"] = formatted["coordinate_source_dataset"]
        formatted["coordinateSourceType"] = formatted["coordinate_source_type"]

        if self.in_memory:
            self.memory_store["habitations"][hab["id"]] = formatted
            return dict(formatted)

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO habitations (
                        id, name, code, district, region, region_type, taluk, lat, lng, population,
                        affected_population, elderly, children, medical_priority, hazard_type,
                        hazard_level, assigned_shelter_id, distance_to_shelter_km, relocation_status,
                        evacuation_progress, road_condition, priority, response_status,
                        source_name, source_url, source_dataset, source_type,
                        coordinate_source_name, coordinate_source_url, coordinate_source_dataset, coordinate_source_type,
                        data_status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        code = EXCLUDED.code,
                        district = EXCLUDED.district,
                        region = EXCLUDED.region,
                        region_type = EXCLUDED.region_type,
                        taluk = EXCLUDED.taluk,
                        lat = EXCLUDED.lat,
                        lng = EXCLUDED.lng,
                        population = EXCLUDED.population,
                        source_name = EXCLUDED.source_name,
                        source_url = EXCLUDED.source_url,
                        source_dataset = EXCLUDED.source_dataset,
                        source_type = EXCLUDED.source_type,
                        coordinate_source_name = EXCLUDED.coordinate_source_name,
                        coordinate_source_url = EXCLUDED.coordinate_source_url,
                        coordinate_source_dataset = EXCLUDED.coordinate_source_dataset,
                        coordinate_source_type = EXCLUDED.coordinate_source_type,
                        data_status = EXCLUDED.data_status
                """, (
                    formatted["id"], formatted["name"], formatted["code"], formatted["district"],
                    formatted["region"], formatted["region_type"], formatted["taluk"], formatted["lat"], formatted["lng"],
                    formatted["population"], formatted["affectedPopulation"], formatted["elderly"],
                    formatted["children"], formatted["medicalPriority"], formatted["hazardType"],
                    formatted["hazardLevel"], formatted["assignedShelterId"], formatted["distanceToShelterKm"],
                    formatted["relocationStatus"], formatted["evacuationProgress"], formatted["roadCondition"],
                    formatted["priority"], formatted["responseStatus"], formatted["source_name"],
                    formatted["source_url"], formatted["source_dataset"], formatted["source_type"],
                    formatted["coordinate_source_name"], formatted["coordinate_source_url"],
                    formatted["coordinate_source_dataset"], formatted["coordinate_source_type"],
                    formatted["data_status"]
                ))
            conn.commit()
        return dict(formatted)

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

    def upsert_road(self, road):
        if not isinstance(road, dict) or not road.get("id"):
            raise ValueError("Road record must be a dict containing a unique 'id' field.")

        formatted = {
            "id": road["id"],
            "name": road.get("name"),
            "highway_class": road.get("highway_class") or road.get("highwayClass"),
            "geometry": road.get("geometry"),
            "surface": road.get("surface"),
            "bridge": road.get("bridge"),
            "is_oneway": road.get("is_oneway") or road.get("isOneway"),
            "access": road.get("access"),
            "maxspeed": road.get("maxspeed"),
            "source_name": road.get("source_name") or road.get("sourceName"),
            "source_url": road.get("source_url") or road.get("sourceUrl"),
            "source_dataset": road.get("source_dataset") or road.get("sourceDataset"),
            "source_type": road.get("source_type") or road.get("sourceType"),
            "data_status": road.get("data_status") or road.get("dataStatus") or "REAL",
            "observation_time": road.get("observation_time") or road.get("observationTime")
        }

        if self.in_memory:
            self.memory_store["roads"][road["id"]] = formatted
            return dict(formatted)

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO roads (
                        id, name, highway_class, geometry, surface, bridge, is_oneway, access,
                        maxspeed, source_name, source_url, source_dataset, source_type, data_status, observation_time
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        highway_class = EXCLUDED.highway_class,
                        geometry = EXCLUDED.geometry,
                        surface = EXCLUDED.surface,
                        bridge = EXCLUDED.bridge,
                        is_oneway = EXCLUDED.is_oneway,
                        access = EXCLUDED.access,
                        maxspeed = EXCLUDED.maxspeed,
                        source_name = EXCLUDED.source_name,
                        source_url = EXCLUDED.source_url,
                        source_dataset = EXCLUDED.source_dataset,
                        source_type = EXCLUDED.source_type,
                        data_status = EXCLUDED.data_status,
                        observation_time = EXCLUDED.observation_time
                """, (
                    formatted["id"], formatted["name"], formatted["highway_class"], Json(formatted["geometry"]) if formatted["geometry"] else None,
                    formatted["surface"], formatted["bridge"], formatted["is_oneway"], formatted["access"],
                    formatted["maxspeed"], formatted["source_name"], formatted["source_url"],
                    formatted["source_dataset"], formatted["source_type"], formatted["data_status"],
                    formatted["observation_time"]
                ))
            conn.commit()
        return dict(formatted)

    def get_all_roads(self):
        if self.in_memory:
            return list(self.memory_store["roads"].values())

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM roads")
                rows = cur.fetchall()
                res = []
                for r in rows:
                    res.append({
                        "id": r["id"],
                        "name": r["name"],
                        "highway_class": r["highway_class"],
                        "geometry": r["geometry"],
                        "surface": r["surface"],
                        "bridge": r["bridge"],
                        "is_oneway": r["is_oneway"],
                        "access": r["access"],
                        "maxspeed": r["maxspeed"],
                        "source_name": r["source_name"],
                        "source_url": r["source_url"],
                        "source_dataset": r["source_dataset"],
                        "source_type": r["source_type"],
                        "data_status": r["data_status"],
                        "observation_time": str(r["observation_time"]) if r.get("observation_time") else None
                    })
                return res

    def upsert_graph_node(self, node):
        if not isinstance(node, dict) or not node.get("id"):
            raise ValueError("Graph node must have an 'id'")
            
        formatted = {
            "id": node["id"],
            "lat": node.get("lat"),
            "lng": node.get("lng"),
            "source_name": node.get("source_name", "OpenStreetMap"),
            "source_type": node.get("source_type", "OPEN_GEO"),
            "data_status": node.get("data_status", "REAL")
        }
        
        if self.in_memory:
            self.memory_store["graph_nodes"][node["id"]] = formatted
            return formatted

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO graph_nodes (id, lat, lng, source_name, source_type, data_status)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        lat = EXCLUDED.lat,
                        lng = EXCLUDED.lng
                """, (
                    formatted["id"], formatted["lat"], formatted["lng"],
                    formatted["source_name"], formatted["source_type"], formatted["data_status"]
                ))
            conn.commit()
        return formatted

    def upsert_graph_edge(self, edge):
        if not isinstance(edge, dict) or not edge.get("id"):
            raise ValueError("Graph edge must have an 'id'")
            
        formatted = {
            "id": edge["id"],
            "from_node": edge.get("from_node"),
            "to_node": edge.get("to_node"),
            "osm_way_id": edge.get("osm_way_id"),
            "name": edge.get("name"),
            "highway_class": edge.get("highway_class"),
            "geometry": edge.get("geometry"),
            "length_m": edge.get("length_m"),
            "surface": edge.get("surface"),
            "bridge": edge.get("bridge"),
            "is_oneway": edge.get("is_oneway"),
            "access": edge.get("access"),
            "maxspeed": edge.get("maxspeed"),
            "source_name": edge.get("source_name", "OpenStreetMap"),
            "source_type": edge.get("source_type", "OPEN_GEO"),
            "data_status": edge.get("data_status", "REAL")
        }
        
        if self.in_memory:
            self.memory_store["graph_edges"][edge["id"]] = formatted
            return formatted

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO graph_edges (
                        id, from_node, to_node, osm_way_id, name, highway_class,
                        geometry, length_m, surface, bridge, is_oneway, access,
                        maxspeed, source_name, source_type, data_status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        from_node = EXCLUDED.from_node,
                        to_node = EXCLUDED.to_node,
                        osm_way_id = EXCLUDED.osm_way_id,
                        name = EXCLUDED.name,
                        highway_class = EXCLUDED.highway_class,
                        geometry = EXCLUDED.geometry,
                        length_m = EXCLUDED.length_m,
                        surface = EXCLUDED.surface,
                        bridge = EXCLUDED.bridge,
                        is_oneway = EXCLUDED.is_oneway,
                        access = EXCLUDED.access,
                        maxspeed = EXCLUDED.maxspeed
                """, (
                    formatted["id"], formatted["from_node"], formatted["to_node"], formatted["osm_way_id"],
                    formatted["name"], formatted["highway_class"], Json(formatted["geometry"]) if formatted["geometry"] else None,
                    formatted["length_m"], formatted["surface"], formatted["bridge"], formatted["is_oneway"],
                    formatted["access"], formatted["maxspeed"], formatted["source_name"],
                    formatted["source_type"], formatted["data_status"]
                ))
            conn.commit()
        return formatted

    def get_all_graph_nodes(self):
        if self.in_memory:
            return list(self.memory_store["graph_nodes"].values())
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM graph_nodes")
                return [dict(r) for r in cur.fetchall()]

    def get_all_graph_edges(self):
        if self.in_memory:
            return list(self.memory_store["graph_edges"].values())
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM graph_edges")
                return [dict(r) for r in cur.fetchall()]

    def upsert_network_access(self, access):
        if not isinstance(access, dict) or not access.get("id"):
            raise ValueError("Network access record must have an 'id'")
            
        formatted = {
            "id": access["id"],
            "entity_id": access.get("entity_id"),
            "entity_type": access.get("entity_type"),
            "graph_node_id": access.get("graph_node_id"),
            "access_distance_m": access.get("access_distance_m"),
            "component_id": access.get("component_id"),
            "is_operational": access.get("is_operational"),
            "connection_method": access.get("connection_method"),
            "source_type": access.get("source_type", "DERIVED"),
            "data_status": access.get("data_status", "DERIVED")
        }
        
        if self.in_memory:
            self.memory_store["network_access"][access["id"]] = formatted
            return formatted

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO network_access (
                        id, entity_id, entity_type, graph_node_id, access_distance_m,
                        component_id, is_operational, connection_method, source_type, data_status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        entity_id = EXCLUDED.entity_id,
                        entity_type = EXCLUDED.entity_type,
                        graph_node_id = EXCLUDED.graph_node_id,
                        access_distance_m = EXCLUDED.access_distance_m,
                        component_id = EXCLUDED.component_id,
                        is_operational = EXCLUDED.is_operational,
                        connection_method = EXCLUDED.connection_method,
                        source_type = EXCLUDED.source_type,
                        data_status = EXCLUDED.data_status
                """, (
                    formatted["id"], formatted["entity_id"], formatted["entity_type"],
                    formatted["graph_node_id"], formatted["access_distance_m"],
                    formatted["component_id"], formatted["is_operational"],
                    formatted["connection_method"], formatted["source_type"], formatted["data_status"]
                ))
            conn.commit()
        return formatted

    def get_all_network_access(self):
        if self.in_memory:
            return list(self.memory_store["network_access"].values())
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM network_access")
                return [dict(r) for r in cur.fetchall()]

    def upsert_facility(self, facility):
        if not isinstance(facility, dict) or not facility.get("id"):
            raise ValueError("Facility must have an 'id'")
            
        formatted = {
            "id": facility["id"],
            "osm_element_id": facility.get("osm_element_id"),
            "name": facility.get("name"),
            "district": facility.get("district", "Kodagu"),
            "taluk": facility.get("taluk"),
            "lat": facility.get("lat"),
            "lng": facility.get("lng"),
            "facility_type": facility.get("facility_type"),
            "source_name": facility.get("source_name", "OpenStreetMap"),
            "source_url": facility.get("source_url"),
            "source_dataset": facility.get("source_dataset"),
            "source_type": facility.get("source_type", "OPEN_GEO"),
            "data_status": facility.get("data_status", "REAL"),
            "observation_time": facility.get("observation_time")
        }
        
        if self.in_memory:
            self.memory_store["facilities"][facility["id"]] = formatted
            return formatted

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO facilities (
                        id, osm_element_id, name, district, taluk, lat, lng,
                        facility_type, source_name, source_url, source_dataset,
                        source_type, data_status, observation_time
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        district = EXCLUDED.district,
                        taluk = EXCLUDED.taluk,
                        lat = EXCLUDED.lat,
                        lng = EXCLUDED.lng,
                        facility_type = EXCLUDED.facility_type,
                        source_url = EXCLUDED.source_url,
                        observation_time = EXCLUDED.observation_time
                """, (
                    formatted["id"], formatted["osm_element_id"], formatted["name"],
                    formatted["district"], formatted["taluk"], formatted["lat"], formatted["lng"],
                    formatted["facility_type"], formatted["source_name"], formatted["source_url"],
                    formatted["source_dataset"], formatted["source_type"], formatted["data_status"],
                    formatted["observation_time"]
                ))
            conn.commit()
        return formatted

    def get_all_facilities(self):
        if self.in_memory:
            return list(self.memory_store["facilities"].values())
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM facilities")
                rows = cur.fetchall()
                res = []
                for r in rows:
                    res.append({
                        "id": r["id"],
                        "osm_element_id": r["osm_element_id"],
                        "name": r["name"],
                        "district": r["district"],
                        "taluk": r["taluk"],
                        "lat": r["lat"],
                        "lng": r["lng"],
                        "facility_type": r["facility_type"],
                        "source_name": r["source_name"],
                        "source_url": r["source_url"],
                        "source_dataset": r["source_dataset"],
                        "source_type": r["source_type"],
                        "data_status": r["data_status"],
                        "observation_time": str(r["observation_time"]) if r.get("observation_time") else None
                    })
                return res

    def upsert_safe_site_operation(self, op):
        if not isinstance(op, dict) or not op.get("id"):
            raise ValueError("Safe site operation must have an 'id'")
            
        formatted = {
            "id": op["id"],
            "facility_id": op.get("facility_id"),
            "operational_status": op.get("operational_status"),
            "capacity": op.get("capacity"),
            "occupancy": op.get("occupancy"),
            "available_capacity": op.get("available_capacity"),
            "water_ready": op.get("water_ready"),
            "food_ready": op.get("food_ready"),
            "medical_ready": op.get("medical_ready"),
            "power_ready": op.get("power_ready"),
            "accessibility_status": op.get("accessibility_status"),
            "suitability_score": op.get("suitability_score"),
            "suitability_level": op.get("suitability_level"),
            "assessment_reason": op.get("assessment_reason"),
            "data_status": op.get("data_status", "SCENARIO"),
            "scenario_id": op.get("scenario_id"),
            "created_at": op.get("created_at"),
            "updated_at": op.get("updated_at")
        }
        
        if self.in_memory:
            self.memory_store["safe_site_operations"][op["id"]] = formatted
            return formatted

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO safe_site_operations (
                        id, facility_id, operational_status, capacity, occupancy,
                        available_capacity, water_ready, food_ready, medical_ready,
                        power_ready, accessibility_status, suitability_score,
                        suitability_level, assessment_reason, data_status,
                        scenario_id, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        operational_status = EXCLUDED.operational_status,
                        capacity = EXCLUDED.capacity,
                        occupancy = EXCLUDED.occupancy,
                        available_capacity = EXCLUDED.available_capacity,
                        water_ready = EXCLUDED.water_ready,
                        food_ready = EXCLUDED.food_ready,
                        medical_ready = EXCLUDED.medical_ready,
                        power_ready = EXCLUDED.power_ready,
                        accessibility_status = EXCLUDED.accessibility_status,
                        suitability_score = EXCLUDED.suitability_score,
                        suitability_level = EXCLUDED.suitability_level,
                        assessment_reason = EXCLUDED.assessment_reason,
                        updated_at = EXCLUDED.updated_at
                """, (
                    formatted["id"], formatted["facility_id"], formatted["operational_status"],
                    formatted["capacity"], formatted["occupancy"], formatted["available_capacity"],
                    formatted["water_ready"], formatted["food_ready"], formatted["medical_ready"],
                    formatted["power_ready"], formatted["accessibility_status"],
                    formatted["suitability_score"], formatted["suitability_level"],
                    formatted["assessment_reason"], formatted["data_status"],
                    formatted["scenario_id"], formatted["created_at"], formatted["updated_at"]
                ))
            conn.commit()
        return formatted

    def get_all_safe_site_operations(self):
        if self.in_memory:
            return list(self.memory_store["safe_site_operations"].values())
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM safe_site_operations")
                return [dict(r) for r in cur.fetchall()]

    def upsert_hazard_exposure(self, exp):
        if not isinstance(exp, dict) or not exp.get("id"):
            raise ValueError("Hazard exposure must have an 'id'")
            
        formatted = {
            "id": exp["id"],
            "entity_id": exp.get("entity_id"),
            "entity_type": exp.get("entity_type"),
            "flood_exposure": exp.get("flood_exposure", "UNKNOWN"),
            "landslide_exposure": exp.get("landslide_exposure", "UNKNOWN"),
            "overall_exposure": exp.get("overall_exposure", "UNKNOWN"),
            "evidence": exp.get("evidence"),
            "methodology": exp.get("methodology"),
            "data_status": exp.get("data_status", "DERIVED"),
            "assessed_at": exp.get("assessed_at")
        }
        
        if self.in_memory:
            self.memory_store["hazard_exposures"][exp["id"]] = formatted
            return formatted

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO hazard_exposures (
                        id, entity_id, entity_type, flood_exposure, landslide_exposure,
                        overall_exposure, evidence, methodology, data_status, assessed_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        flood_exposure = EXCLUDED.flood_exposure,
                        landslide_exposure = EXCLUDED.landslide_exposure,
                        overall_exposure = EXCLUDED.overall_exposure,
                        evidence = EXCLUDED.evidence,
                        methodology = EXCLUDED.methodology,
                        data_status = EXCLUDED.data_status,
                        assessed_at = EXCLUDED.assessed_at
                """, (
                    formatted["id"], formatted["entity_id"], formatted["entity_type"],
                    formatted["flood_exposure"], formatted["landslide_exposure"],
                    formatted["overall_exposure"], formatted["evidence"],
                    formatted["methodology"], formatted["data_status"], formatted["assessed_at"]
                ))
            conn.commit()
        return formatted

    def get_all_hazard_exposures(self):
        if self.in_memory:
            return list(self.memory_store["hazard_exposures"].values())
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM hazard_exposures")
                return [dict(r) for r in cur.fetchall()]

    # ==========================
    # SCENARIOS
    # ==========================
    def upsert_scenario(self, scenario):
        s_id = scenario["id"]
        formatted = {
            "id": s_id,
            "name": scenario.get("name"),
            "label": scenario.get("label", "SCENARIO"),
            "type": scenario.get("type"),
            "description": scenario.get("description"),
            "rainfall_24h_mm": scenario.get("rainfall_24h_mm"),
            "river_stage_m": scenario.get("river_stage_m"),
            "flood_influence_radius_km": scenario.get("flood_influence_radius_km"),
            "landslide_influence_radius_km": scenario.get("landslide_influence_radius_km"),
            "landslide_rainfall_trigger_mm": scenario.get("landslide_rainfall_trigger_mm"),
            "affected_road_fraction": scenario.get("affected_road_fraction"),
            "severity": scenario.get("severity"),
            "data_status": scenario.get("data_status", "SCENARIO"),
            "created_at": scenario.get("created_at")
        }
        if self.in_memory:
            self.memory_store["scenarios"][s_id] = formatted
            return formatted

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO scenarios (
                        id, name, label, type, description, rainfall_24h_mm, river_stage_m,
                        flood_influence_radius_km, landslide_influence_radius_km,
                        landslide_rainfall_trigger_mm, affected_road_fraction, severity,
                        data_status, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        label = EXCLUDED.label,
                        type = EXCLUDED.type,
                        description = EXCLUDED.description,
                        rainfall_24h_mm = EXCLUDED.rainfall_24h_mm,
                        river_stage_m = EXCLUDED.river_stage_m,
                        flood_influence_radius_km = EXCLUDED.flood_influence_radius_km,
                        landslide_influence_radius_km = EXCLUDED.landslide_influence_radius_km,
                        landslide_rainfall_trigger_mm = EXCLUDED.landslide_rainfall_trigger_mm,
                        affected_road_fraction = EXCLUDED.affected_road_fraction,
                        severity = EXCLUDED.severity,
                        data_status = EXCLUDED.data_status,
                        created_at = EXCLUDED.created_at
                """, (
                    formatted["id"], formatted["name"], formatted["label"], formatted["type"],
                    formatted["description"], formatted["rainfall_24h_mm"], formatted["river_stage_m"],
                    formatted["flood_influence_radius_km"], formatted["landslide_influence_radius_km"],
                    formatted["landslide_rainfall_trigger_mm"], formatted["affected_road_fraction"],
                    formatted["severity"], formatted["data_status"], formatted["created_at"]
                ))
            conn.commit()
        self.memory_store["scenarios"][s_id] = formatted
        return formatted

    def get_all_scenarios(self):
        if self.in_memory:
            return list(self.memory_store["scenarios"].values())
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM scenarios")
                rows = [dict(r) for r in cur.fetchall()]
                for r in rows:
                    if r.get("created_at") is not None:
                        r["created_at"] = str(r["created_at"])
                    self.memory_store["scenarios"][r["id"]] = r
                return rows

    def get_scenario(self, scenario_id):
        if self.in_memory:
            return self.memory_store["scenarios"].get(scenario_id)
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM scenarios WHERE id = %s", (scenario_id,))
                row = cur.fetchone()
                if row:
                    d = dict(row)
                    if d.get("created_at") is not None:
                        d["created_at"] = str(d["created_at"])
                    self.memory_store["scenarios"][scenario_id] = d
                    return d
        return None

    def upsert_scenario_exposure(self, exp):
        e_id = exp["id"]
        formatted = {
            "id": e_id,
            "scenario_id": exp.get("scenario_id"),
            "entity_id": exp.get("entity_id"),
            "entity_type": exp.get("entity_type"),
            "flood_exposure": exp.get("flood_exposure"),
            "landslide_exposure": exp.get("landslide_exposure"),
            "overall_exposure": exp.get("overall_exposure"),
            "impact_reason": exp.get("impact_reason"),
            "data_status": exp.get("data_status", "SCENARIO")
        }
        if self.in_memory:
            self.memory_store["scenario_exposures"][e_id] = formatted
            return formatted

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO scenario_exposures (
                        id, scenario_id, entity_id, entity_type,
                        flood_exposure, landslide_exposure, overall_exposure,
                        impact_reason, data_status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        scenario_id = EXCLUDED.scenario_id,
                        entity_id = EXCLUDED.entity_id,
                        entity_type = EXCLUDED.entity_type,
                        flood_exposure = EXCLUDED.flood_exposure,
                        landslide_exposure = EXCLUDED.landslide_exposure,
                        overall_exposure = EXCLUDED.overall_exposure,
                        impact_reason = EXCLUDED.impact_reason,
                        data_status = EXCLUDED.data_status
                """, (
                    formatted["id"], formatted["scenario_id"], formatted["entity_id"],
                    formatted["entity_type"], formatted["flood_exposure"],
                    formatted["landslide_exposure"], formatted["overall_exposure"],
                    formatted["impact_reason"], formatted["data_status"]
                ))
            conn.commit()
        self.memory_store["scenario_exposures"][e_id] = formatted
        return formatted

    def get_scenario_exposures(self, scenario_id):
        if self.in_memory:
            return [e for e in self.memory_store["scenario_exposures"].values() if e["scenario_id"] == scenario_id]
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM scenario_exposures WHERE scenario_id = %s", (scenario_id,))
                rows = [dict(r) for r in cur.fetchall()]
                for r in rows:
                    self.memory_store["scenario_exposures"][r["id"]] = r
                return rows

    def upsert_scenario_road_impact(self, imp):
        i_id = imp["id"]
        formatted = {
            "id": i_id,
            "scenario_id": imp.get("scenario_id"),
            "road_id": imp.get("road_id"),
            "impact_status": imp.get("impact_status"),
            "impact_reason": imp.get("impact_reason"),
            "data_status": imp.get("data_status", "SCENARIO")
        }
        if self.in_memory:
            self.memory_store["scenario_road_impacts"][i_id] = formatted
            return formatted

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO scenario_road_impacts (
                        id, scenario_id, road_id, impact_status, impact_reason, data_status
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        scenario_id = EXCLUDED.scenario_id,
                        road_id = EXCLUDED.road_id,
                        impact_status = EXCLUDED.impact_status,
                        impact_reason = EXCLUDED.impact_reason,
                        data_status = EXCLUDED.data_status
                """, (
                    formatted["id"], formatted["scenario_id"], formatted["road_id"],
                    formatted["impact_status"], formatted["impact_reason"],
                    formatted["data_status"]
                ))
            conn.commit()
        self.memory_store["scenario_road_impacts"][i_id] = formatted
        return formatted

    def get_scenario_road_impacts(self, scenario_id):
        if self.in_memory:
            impacts = [dict(i) for i in self.memory_store["scenario_road_impacts"].values() if i["scenario_id"] == scenario_id]
            roads_map = self.memory_store["roads"]
            for imp in impacts:
                road = roads_map.get(imp["road_id"])
                if road:
                    imp["geometry"] = road.get("geometry")
            return impacts

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT sri.id, sri.scenario_id, sri.road_id, sri.impact_status, sri.impact_reason, sri.data_status, r.geometry
                    FROM scenario_road_impacts sri
                    LEFT JOIN roads r ON sri.road_id = r.id
                    WHERE sri.scenario_id = %s
                """, (scenario_id,))
                rows = [dict(r) for r in cur.fetchall()]
                for r in rows:
                    self.memory_store["scenario_road_impacts"][r["id"]] = r
                return rows

    def upsert_scenario_relocation(self, reloc):
        r_id = reloc["id"]
        formatted = {
            "id": r_id,
            "scenario_id": reloc.get("scenario_id"),
            "settlement_id": reloc.get("settlement_id"),
            "recommended_site_id": reloc.get("recommended_site_id"),
            "priority": reloc.get("priority"),
            "required_capacity": reloc.get("required_capacity"),
            "available_capacity": reloc.get("available_capacity"),
            "capacity_status": reloc.get("capacity_status"),
            "route_status": reloc.get("route_status"),
            "route_distance_m": reloc.get("route_distance_m"),
            "estimated_travel_time_min": reloc.get("estimated_travel_time_min"),
            "candidate_count": reloc.get("candidate_count"),
            "recommendation_reason": reloc.get("recommendation_reason"),
            "route_geometry": reloc.get("route_geometry"),
            "data_status": reloc.get("data_status", "SCENARIO"),
            "created_at": reloc.get("created_at")
        }
        if self.in_memory:
            self.memory_store["scenario_relocations"][r_id] = formatted
            return formatted

        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO scenario_relocations (
                        id, scenario_id, settlement_id, recommended_site_id,
                        priority, required_capacity, available_capacity,
                        capacity_status, route_status, route_distance_m,
                        estimated_travel_time_min, candidate_count,
                        recommendation_reason, route_geometry, data_status, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        scenario_id = EXCLUDED.scenario_id,
                        settlement_id = EXCLUDED.settlement_id,
                        recommended_site_id = EXCLUDED.recommended_site_id,
                        priority = EXCLUDED.priority,
                        required_capacity = EXCLUDED.required_capacity,
                        available_capacity = EXCLUDED.available_capacity,
                        capacity_status = EXCLUDED.capacity_status,
                        route_status = EXCLUDED.route_status,
                        route_distance_m = EXCLUDED.route_distance_m,
                        estimated_travel_time_min = EXCLUDED.estimated_travel_time_min,
                        candidate_count = EXCLUDED.candidate_count,
                        recommendation_reason = EXCLUDED.recommendation_reason,
                        route_geometry = EXCLUDED.route_geometry,
                        data_status = EXCLUDED.data_status,
                        created_at = EXCLUDED.created_at
                """, (
                    formatted["id"], formatted["scenario_id"], formatted["settlement_id"],
                    formatted["recommended_site_id"], formatted["priority"],
                    formatted["required_capacity"], formatted["available_capacity"],
                    formatted["capacity_status"], formatted["route_status"],
                    formatted["route_distance_m"], formatted["estimated_travel_time_min"],
                    formatted["candidate_count"], formatted["recommendation_reason"],
                    Json(formatted["route_geometry"]) if formatted["route_geometry"] else None,
                    formatted["data_status"], formatted["created_at"]
                ))
            conn.commit()
        self.memory_store["scenario_relocations"][r_id] = formatted
        return formatted

    def get_scenario_relocations(self, scenario_id):
        if self.in_memory:
            return [r for r in self.memory_store["scenario_relocations"].values() if r["scenario_id"] == scenario_id]
        with self._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM scenario_relocations WHERE scenario_id = %s", (scenario_id,))
                rows = [dict(r) for r in cur.fetchall()]
                for r in rows:
                    if r.get("created_at") is not None:
                        r["created_at"] = str(r["created_at"])
                    self.memory_store["scenario_relocations"][r["id"]] = r
                return rows

    def get_scenario_relocation(self, scenario_id, settlement_id):
        rels = self.get_scenario_relocations(scenario_id)
        for r in rels:
            if r["settlement_id"] == settlement_id:
                return r
        return None

# Singleton repository
repo = Repository()
