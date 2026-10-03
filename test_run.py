import sys
import traceback
from app import create_app
from app.services.relocation_service import relocation_service

app = create_app()
with app.app_context():
    try:
        relocation_service.run_scenario_relocation("KODAGU_EXTREME_MONSOON_HARSH_CASE")
        print("SUCCESS")
    except Exception as e:
        print("EXCEPTION HAPPENED:")
        traceback.print_exc()
