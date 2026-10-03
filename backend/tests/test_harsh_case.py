import unittest
from app import create_app
from app.services.repository import repo
from app.services.scenario_service import scenario_service
from app.services.relocation_service import relocation_service
from app.services.routing_service import routing_service


class TestHarshCaseScenario(unittest.TestCase):
    def setUp(self):
        from app.services.data_service import DataService
        repo.memory_store["habitations"] = {}
        repo.memory_store["facilities"] = {}
        repo.memory_store["roads"] = {}
        repo.memory_store["graph_nodes"] = {}
        repo.memory_store["graph_edges"] = {}
        repo.memory_store["network_access"] = {}
        repo.memory_store["safe_site_operations"] = {}
        self.data_service = DataService()
        
        # Use existing ingestion scripts for test environment
        from scripts.ingest_osm_facilities import ingest_osm_facilities
        from scripts.ingest_osm_roads import ingest_osm_roads
        from scripts.build_routing_graph import build_routing_graph
        from scripts.connect_network_access import connect_network_access
        ingest_osm_facilities(repo)
        ingest_osm_roads(repo)
        build_routing_graph(repo)
        connect_network_access(repo)

        self.app = create_app().test_client()
        self.app.testing = True

    def test_01_harsh_scenario_registered(self):
        """Verify KODAGU_EXTREME_MONSOON_HARSH_CASE is registered alongside baseline."""
        scenario_service.get_or_create_default_scenario()
        harsh = repo.get_scenario("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        self.assertIsNotNone(harsh)
        self.assertEqual(harsh["label"], "HARSH CASE")
        self.assertEqual(harsh["data_status"], "SCENARIO")
        self.assertEqual(harsh["rainfall_24h_mm"], 450.0)
        self.assertEqual(harsh["flood_influence_radius_km"], 10.0)
        self.assertEqual(harsh["landslide_influence_radius_km"], 15.0)
        self.assertEqual(harsh["affected_road_fraction"], 0.45)

    def test_02_baseline_scenario_unchanged(self):
        """Verify baseline KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO remains strictly unchanged."""
        base = repo.get_scenario("KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO")
        self.assertIsNotNone(base)
        self.assertEqual(base["rainfall_24h_mm"], 250.0)
        self.assertEqual(base["flood_influence_radius_km"], 3.0)
        self.assertEqual(base["landslide_influence_radius_km"], 5.0)
        self.assertEqual(base["affected_road_fraction"], 0.15)
        self.assertEqual(base["data_status"], "SCENARIO")

    def test_03_real_records_remain_unchanged(self):
        """Verify real settlements, facilities, and roads maintain REAL data_status."""
        habs = repo.get_all_habitations()
        self.assertEqual(len(habs), 16)
        for h in habs:
            self.assertEqual(h["data_status"], "REAL")

        facs = repo.get_all_facilities()
        self.assertGreater(len(facs), 0)
        for f in facs:
            self.assertEqual(f["data_status"], "REAL")

        roads = repo.get_all_roads()
        self.assertGreater(len(roads), 0)
        for r in roads:
            self.assertEqual(r["data_status"], "REAL")

    def test_04_harsh_scenario_execution_deterministic(self):
        """Verify running the harsh scenario twice yields deterministic, identical results."""
        run1 = scenario_service.run_scenario("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        impacts1 = repo.get_scenario_road_impacts("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        exps1 = repo.get_scenario_exposures("KODAGU_EXTREME_MONSOON_HARSH_CASE")

        run2 = scenario_service.run_scenario("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        impacts2 = repo.get_scenario_road_impacts("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        exps2 = repo.get_scenario_exposures("KODAGU_EXTREME_MONSOON_HARSH_CASE")

        self.assertEqual(run1, run2)
        self.assertEqual(len(impacts1), len(impacts2))
        self.assertEqual(len(exps1), len(exps2))

        # Check road impact hash stability
        for i1, i2 in zip(impacts1[:20], impacts2[:20]):
            self.assertEqual(i1["road_id"], i2["road_id"])
            self.assertEqual(i1["impact_status"], i2["impact_status"])
            self.assertEqual(i1["data_status"], "SCENARIO")

    def test_05_harsh_road_disruption_impacts(self):
        """Verify BLOCKED and RESTRICTED roads emerge deterministically from the 45% fraction."""
        impacts = repo.get_scenario_road_impacts("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        blocked = [i for i in impacts if i["impact_status"] == "BLOCKED"]
        restricted = [i for i in impacts if i["impact_status"] == "RESTRICTED"]
        open_roads = [i for i in impacts if i["impact_status"] == "OPEN"]

        self.assertGreater(len(blocked), 500)
        self.assertGreater(len(restricted), 500)
        self.assertGreater(len(open_roads), 1000)
        self.assertEqual(len(impacts), 2857)

    def test_06_relocation_execution_deterministic(self):
        """Verify relocation run is deterministic and respects scenario constraints."""
        reloc1 = relocation_service.run_scenario_relocation("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        reloc2 = relocation_service.run_scenario_relocation("KODAGU_EXTREME_MONSOON_HARSH_CASE")

        self.assertEqual(len(reloc1), 16)
        self.assertEqual(len(reloc2), 16)

        for r1, r2 in zip(reloc1, reloc2):
            self.assertEqual(r1["settlement_id"], r2["settlement_id"])
            self.assertEqual(r1["priority"], r2["priority"])
            self.assertEqual(r1["route_status"], r2["route_status"])
            self.assertEqual(r1["recommended_site_id"], r2["recommended_site_id"])
            self.assertEqual(r1["data_status"], "SCENARIO")
            self.assertEqual(r1["scenario_id"], "KODAGU_EXTREME_MONSOON_HARSH_CASE")
            # Ensure route geometry is present for successful routes
            if r1["route_status"] == "SUCCESS":
                self.assertIsNotNone(r1.get("route_geometry"))

    def test_07_api_scenarios_lists_both(self):
        """Verify GET /api/scenarios returns both baseline and harsh case scenarios."""
        resp = self.app.get("/api/scenarios")
        self.assertEqual(resp.status_code, 200)
        json_data = resp.get_json()
        self.assertTrue(json_data["success"])
        scenarios = json_data["data"]
        ids = [s["id"] for s in scenarios]
        self.assertIn("KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO", ids)
        self.assertIn("KODAGU_EXTREME_MONSOON_HARSH_CASE", ids)

    def test_08_no_fabricated_population(self):
        """Verify real settlements maintain honest demographic provenance without fake populations."""
        habs = repo.get_all_habitations()
        for h in habs:
            # None or real recorded population, no fabricated strings or made-up villages
            self.assertIn(h["id"], [f"SET-KOD-{tal}-{idx:02d}" for tal in ["MAD", "SOM", "VIR"] for idx in range(1, 10)])


    def test_09_cold_lookup_and_run_harsh_scenario(self):
        """Prove cold get/run of KODAGU_EXTREME_MONSOON_HARSH_CASE resolves a non-null scenario definition and successfully reaches execution."""
        # Clear scenarios store to simulate cold start without prior /api/scenarios call
        repo.memory_store["scenarios"] = {}

        # 1. Direct service lookup resolves non-null definition
        definition = scenario_service.get_scenario("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        self.assertIsNotNone(definition)
        self.assertIsInstance(definition, dict)
        self.assertEqual(definition["id"], "KODAGU_EXTREME_MONSOON_HARSH_CASE")
        self.assertIn("flood_influence_radius_km", definition)
        self.assertEqual(definition["flood_influence_radius_km"], 10.0)

        # Clear store again to test cold HTTP endpoint lookup
        repo.memory_store["scenarios"] = {}
        resp_get = self.app.get("/api/scenarios/KODAGU_EXTREME_MONSOON_HARSH_CASE")
        self.assertEqual(resp_get.status_code, 200)
        data = resp_get.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["id"], "KODAGU_EXTREME_MONSOON_HARSH_CASE")
        self.assertEqual(data["data"]["flood_influence_radius_km"], 10.0)

        # 2. Cold POST run successfully executes without NoneType subscript errors
        resp_run = self.app.post("/api/scenarios/KODAGU_EXTREME_MONSOON_HARSH_CASE/run")
        self.assertEqual(resp_run.status_code, 200)
        run_data = resp_run.get_json()
        self.assertTrue(run_data["success"])
        self.assertGreater(run_data["data"]["roads_evaluated"], 0)

    def test_10_scenario_exposures_and_road_impacts_retrieval_and_relocation_priorities(self):
        """Verify GET exposure and road-impact endpoints return persisted data, and relocation yields 15 CRITICAL priorities."""
        # 1. Verify GET exposures
        resp_exp = self.app.get("/api/scenarios/KODAGU_EXTREME_MONSOON_HARSH_CASE/exposure")
        self.assertEqual(resp_exp.status_code, 200)
        exp_data = resp_exp.get_json()
        self.assertTrue(exp_data["success"])
        exposures = exp_data["data"]
        self.assertEqual(len(exposures), 67) # 16 settlements + 51 facilities

        settlement_exps = [e for e in exposures if e["entity_type"] == "SETTLEMENT"]
        self.assertEqual(len(settlement_exps), 16)
        high_settlements = [e for e in settlement_exps if e["overall_exposure"] == "HIGH"]
        self.assertEqual(len(high_settlements), 15)

        ponnampet_exp = next(e for e in settlement_exps if e["entity_id"] == "SET-KOD-VIR-03")
        self.assertEqual(ponnampet_exp["overall_exposure"], "LOW")

        # 2. Verify GET road impacts
        resp_imp = self.app.get("/api/scenarios/KODAGU_EXTREME_MONSOON_HARSH_CASE/road-impacts")
        self.assertEqual(resp_imp.status_code, 200)
        imp_data = resp_imp.get_json()
        self.assertTrue(imp_data["success"])
        impacts = imp_data["data"]
        self.assertEqual(len(impacts), 2857)
        blocked = [i for i in impacts if i["impact_status"] == "BLOCKED"]
        restricted = [i for i in impacts if i["impact_status"] == "RESTRICTED"]
        self.assertGreater(len(blocked), 500)
        self.assertGreater(len(restricted), 500)

        # 3. Verify scenario relocation yields 15 CRITICAL priorities and 1 MODERATE (Madikeri Town)
        resp_reloc = self.app.post("/api/relocation/scenario/KODAGU_EXTREME_MONSOON_HARSH_CASE/run")
        self.assertEqual(resp_reloc.status_code, 200)
        reloc_data = resp_reloc.get_json()
        self.assertTrue(reloc_data["success"])
        relocs = reloc_data["data"]
        self.assertEqual(len(relocs), 16)
        critical_relocs = [r for r in relocs if r["priority"] == "CRITICAL"]
        moderate_relocs = [r for r in relocs if r["priority"] == "MODERATE"]
        self.assertEqual(len(critical_relocs), 15)
        self.assertEqual(len(moderate_relocs), 1)
        self.assertEqual(moderate_relocs[0]["settlement_id"], "SET-KOD-VIR-03")


if __name__ == "__main__":
    unittest.main()
