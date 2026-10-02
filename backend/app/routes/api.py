from flask import Blueprint, request
from app.services.data_service import data_service
from app.utils.response import success_response, error_response

api_bp = Blueprint("api", __name__, url_prefix="/api")

@api_bp.route("/health", methods=["GET"])
def health_check():
    return success_response({"status": "UP", "version": "1.0.0"}, message="SIH Backend Operational")

@api_bp.route("/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    stats = data_service.get_dashboard_stats()
    return success_response(stats, message="Dashboard statistics retrieved")

@api_bp.route("/risk-areas", methods=["GET"])
def get_risk_areas():
    areas = data_service.get_risk_areas()
    return success_response(areas, message="Risk areas retrieved")

@api_bp.route("/risk-areas/<area_id>", methods=["GET"])
def get_risk_area_detail(area_id):
    area = data_service.get_risk_area_by_id(area_id)
    if not area:
        return error_response(code="NOT_FOUND", message=f"Risk area '{area_id}' not found", status_code=44)
    return success_response(area, message="Risk area details retrieved")

@api_bp.route("/map", methods=["GET"])
def get_map_data():
    map_data = data_service.get_map_data()
    return success_response(map_data, message="GIS Map data retrieved")

@api_bp.route("/relocation/priorities", methods=["GET"])
def get_relocation_priorities():
    priorities = data_service.get_relocation_priorities()
    return success_response(priorities, message="Relocation priorities retrieved")

@api_bp.route("/relocation/workflow", methods=["GET"])
def get_relocation_workflow():
    workflow = data_service.get_relocation_workflow()
    return success_response(workflow, message="Relocation workflow retrieved")

@api_bp.route("/shelters", methods=["GET"])
def get_shelters():
    shelters = data_service.get_shelters()
    return success_response(shelters, message="Relief shelters retrieved")

@api_bp.route("/resources", methods=["GET"])
def get_resources():
    resources = data_service.get_resources()
    return success_response(resources, message="Emergency resources retrieved")

@api_bp.route("/alerts", methods=["GET"])
def get_alerts():
    alerts = data_service.get_alerts()
    return success_response(alerts, message="Emergency alerts retrieved")

@api_bp.route("/recommendations", methods=["GET"])
def get_recommendations():
    recs = data_service.get_recommendations()
    return success_response(recs, message="Decision recommendations retrieved")

@api_bp.route("/simulation/impact", methods=["POST"])
def calculate_simulation_impact_api():
    from flask import request
    from app.services.simulation_engine import calculate_simulation_impact
    data = request.json or {}

    try:
        rainfall = float(data.get("rainfall", 50))
        slope_instability = float(data.get("slopeInstability", 30))
        river_level = float(data.get("riverLevel", 2.0))

        if rainfall < 0 or slope_instability < 0 or river_level < 0:
            return error_response("Values cannot be negative", status_code=400)
    except (ValueError, TypeError):
        return error_response("Invalid input values. Must be numeric.", status_code=400)

    impact = calculate_simulation_impact(
        rainfall,
        slope_instability,
        river_level,
        data_service.habitations,
        data_service.shelters,
        data_service.resources
    )

    return success_response(impact, message="Simulation impact calculated successfully")

@api_bp.route("/reports", methods=["GET"])
def get_reports():
    reports = data_service.get_reports()
    return success_response(reports, message="Disaster reports retrieved")

@api_bp.route("/relocation/<area_id>/assign", methods=["POST"])
def assign_relocation_shelter(area_id):
    payload = request.get_json() or {}
    shelter_id = payload.get("shelterId")
    if not shelter_id:
        return error_response(code="MISSING_PARAM", message="Parameter 'shelterId' is required", status_code=400)

    updated_hab = data_service.assign_shelter(area_id, shelter_id)
    if not updated_hab:
        return error_response(code="NOT_FOUND", message=f"Area '{area_id}' not found", status_code=404)

    return success_response(updated_hab, message=f"Relocation shelter '{shelter_id}' assigned to {area_id}")

@api_bp.route("/relocation/<area_id>/update-status", methods=["POST"])
def update_relocation_status(area_id):
    payload = request.get_json() or {}
    status = payload.get("status")
    progress = payload.get("progress")

    if not status:
        return error_response(code="MISSING_PARAM", message="Parameter 'status' is required", status_code=400)

    updated_hab = data_service.update_relocation_status(area_id, status, progress)
    if not updated_hab:
        return error_response(code="NOT_FOUND", message=f"Area '{area_id}' not found", status_code=404)

    return success_response(updated_hab, message=f"Relocation status for '{area_id}' updated to '{status}'")

@api_bp.route("/environmental-observations", methods=["GET"])
def get_environmental_observations():
    district = request.args.get("district")
    parameter = request.args.get("parameter")

    observations = data_service.get_environmental_observations(district=district, parameter=parameter)
    return success_response(observations, message="Environmental observations retrieved")

# ==========================================
# ROUTING API
# ==========================================

from app.services.routing_service import routing_service

@api_bp.route("/routing/route", methods=["GET"])
def get_route():
    source_node_id = request.args.get("source_node_id")
    dest_node_id = request.args.get("destination_node_id")
    
    if not source_node_id or not dest_node_id:
        return error_response(
            code="BAD_REQUEST",
            message="Missing source_node_id or destination_node_id",
            status_code=400
        )
        
    result = routing_service.find_shortest_path(source_node_id, dest_node_id)
    
    if result.get("status") == "INVALID_NODE":
        return error_response(
            code="INVALID_NODE",
            message="Source or destination node does not exist in graph",
            status_code=404
        )
        
    if result.get("status") == "NO_ROUTE":
        return success_response({
            "status": "NO_ROUTE",
            "message": "No valid operational route found between nodes."
        })
        
    return success_response(result)

# ==========================================
# SAFE SITES API
# ==========================================
from app.services.safe_site_service import safe_site_service

@api_bp.route("/safe-sites", methods=["GET"])
def get_safe_sites():
    sites = safe_site_service.get_all_safe_sites()
    return success_response(sites, message="Safe sites operational scenario data retrieved")

@api_bp.route("/safe-sites/<facility_id>", methods=["GET"])
def get_safe_site_detail(facility_id):
    site = safe_site_service.get_safe_site(facility_id)
    if not site:
        return error_response(code="NOT_FOUND", message=f"Safe site '{facility_id}' not found", status_code=404)
    return success_response(site, message="Safe site details retrieved")

# ==========================================
# HAZARD EXPOSURE API
# ==========================================
from app.services.hazard_service import hazard_service

@api_bp.route("/hazard-exposure", methods=["GET"])
def get_hazard_exposures():
    exps = hazard_service.get_all_hazard_exposures()
    return success_response(exps, message="Hazard exposures retrieved")

@api_bp.route("/hazard-exposure/<entity_type>/<entity_id>", methods=["GET"])
def get_hazard_exposure_detail(entity_type, entity_id):
    exp = hazard_service.get_hazard_exposure(entity_type.upper(), entity_id)
    if not exp:
        return error_response(code="NOT_FOUND", message=f"Hazard exposure for {entity_type} '{entity_id}' not found", status_code=404)
    return success_response(exp, message="Hazard exposure details retrieved")

# ==========================================
# SCENARIOS API
# ==========================================
from app.services.scenario_service import scenario_service

@api_bp.route("/scenarios", methods=["GET"])
def get_scenarios():
    scenario_service.get_or_create_default_scenario()
    scens = scenario_service.repo.get_all_scenarios()
    return success_response(scens, message="Scenarios retrieved")

@api_bp.route("/scenarios/<scenario_id>", methods=["GET"])
def get_scenario_detail(scenario_id):
    scenario = scenario_service.get_scenario(scenario_id)
    if not scenario:
        return error_response(code="NOT_FOUND", message=f"Scenario '{scenario_id}' not found", status_code=404)
    return success_response(scenario, message="Scenario details retrieved")

@api_bp.route("/scenarios/<scenario_id>/run", methods=["POST"])
def run_scenario_endpoint(scenario_id):
    try:
        res = scenario_service.run_scenario(scenario_id)
        return success_response(res, message="Scenario execution completed")
    except ValueError as e:
        return error_response(code="BAD_REQUEST", message=str(e), status_code=400)

@api_bp.route("/scenarios/<scenario_id>/exposure", methods=["GET"])
def get_scenario_exposures_api(scenario_id):
    exps = scenario_service.repo.get_scenario_exposures(scenario_id)
    return success_response(exps, message="Scenario exposures retrieved")

@api_bp.route("/scenarios/<scenario_id>/road-impacts", methods=["GET"])
def get_scenario_road_impacts_api(scenario_id):
    imps = scenario_service.repo.get_scenario_road_impacts(scenario_id)
    return success_response(imps, message="Scenario road impacts retrieved")

# ==========================================
# SCENARIO RELOCATION API
# ==========================================
from app.services.relocation_service import relocation_service

@api_bp.route("/relocation/scenario/<scenario_id>", methods=["GET"])
def get_scenario_relocations_api(scenario_id):
    rels = relocation_service.repo.get_scenario_relocations(scenario_id)
    return success_response(rels, message="Scenario relocations retrieved")

@api_bp.route("/relocation/scenario/<scenario_id>/settlement/<settlement_id>", methods=["GET"])
def get_scenario_relocation_detail(scenario_id, settlement_id):
    rel = relocation_service.repo.get_scenario_relocation(scenario_id, settlement_id)
    if not rel:
        return error_response(code="NOT_FOUND", message=f"Scenario relocation for settlement '{settlement_id}' not found", status_code=404)
    return success_response(rel, message="Scenario relocation details retrieved")

@api_bp.route("/relocation/scenario/<scenario_id>/run", methods=["POST"])
def run_scenario_relocation_endpoint(scenario_id):
    try:
        res = relocation_service.run_scenario_relocation(scenario_id)
        return success_response(res, message="Scenario relocation executed successfully")
    except Exception as e:
        return error_response(code="INTERNAL_ERROR", message=str(e), status_code=500)




