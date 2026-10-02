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
