import React from "react";

function ResourceManagementView({ resources = {}, habitations = [], safeSites = [] }) {
  // Safe defaults
  const safeResources = resources || {};
  const vehicles = safeResources.emergencyVehicles || { buses: 0, ambulances: 0, rescueTrucks: 0 };
  const medical = safeResources.medicalTeams || { active: 0, onCall: 0 };
  const rescue = safeResources.rescueTeams || { ndrfUnits: 0, fireServices: 0 };
  const supplies = safeResources.supplies || { waterStockLiters: 0, foodRations: 0, blankets: 0, generators: 0 };

  // Relocation Needs
  const safeHabitations = Array.isArray(habitations) ? habitations : [];
  let requiredBuses = 0;
  let requiredAmbulances = 0;

  safeHabitations.forEach(hab => {
    // Only calculate requirements for those not completed
    if (hab.relocationStatus !== "Completed") {
      requiredBuses += Math.ceil((hab.population || 0) / 50);
      requiredAmbulances += Math.ceil((hab.medicalPriority || 0) / 4);
    }
  });

  const busShortage = requiredBuses > vehicles.buses;
  const ambulanceShortage = requiredAmbulances > vehicles.ambulances;

  // Shelter Stocks
  const safeSafeSites = Array.isArray(safeSites) ? safeSites : [];
  let totalShelterWater = 0;
  let totalShelterFood = 0;
  let totalShelterGenerators = 0;

  safeSafeSites.forEach(site => {
    totalShelterWater += (site.waterStockLiters || 0);
    totalShelterFood += (site.foodMealsStock || 0);
    totalShelterGenerators += (site.powerGenerators || 0);
  });

  const shortageCount = (busShortage ? 1 : 0) + (ambulanceShortage ? 1 : 0);
  const activeDeployments = 2; // Medical Teams, Vehicles (buses/ambulances if required)
  const standbyReserves = 2; // Rescue Trucks, NDRF Units

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* PAGE HEADER & OPERATIONAL SUMMARY */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 className="page-title" style={{ margin: "0 0 4px 0", fontSize: "20px" }}>Resource Management & Logistics</h2>
            <p className="page-description" style={{ margin: 0 }}>
              Centralized view of emergency vehicles, response teams, and relief supplies
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-critical)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Resources in Shortage</span>
            <strong style={{ fontSize: "20px", color: shortageCount > 0 ? "var(--accent-critical)" : "var(--text-primary)" }}>{shortageCount}</strong>
          </div>
          <div style={{ width: "1px", height: "32px", background: "var(--border-color)" }}></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-safe)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Deployed Categories</span>
            <strong style={{ fontSize: "20px", color: "var(--accent-safe)" }}>{activeDeployments}</strong>
          </div>
          <div style={{ width: "1px", height: "32px", background: "var(--border-color)" }}></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Available / Standby</span>
            <strong style={{ fontSize: "20px", color: "var(--accent-blue)" }}>{standbyReserves}</strong>
          </div>
        </div>
      </div>

      <div className="grid-2-1">
        {/* RESOURCE ALLOCATION TABLE */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border-color)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Fleet & Personnel</h3>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Current availability vs required active deployments</div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.01)" }}>
                  <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>Resource Type</th>
                  <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>Category</th>
                  <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px", textAlign: "right" }}>Available</th>
                  <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px", textAlign: "right" }}>Required (Active)</th>
                  <th style={{ padding: "12px 20px", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border-color)", background: busShortage ? "rgba(220, 38, 38, 0.05)" : "transparent" }}>
                  <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontWeight: 600 }}>Evacuation Buses</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-muted)", fontSize: "12px" }}>Vehicles</td>
                  <td style={{ padding: "12px 20px", color: busShortage ? "var(--accent-critical)" : "var(--text-primary)", fontWeight: 700, textAlign: "right", fontSize: "14px" }}>{vehicles.buses}</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontWeight: 700, textAlign: "right", fontSize: "14px" }}>{requiredBuses}</td>
                  <td style={{ padding: "12px 20px", textAlign: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: busShortage ? "var(--accent-critical)" : "var(--accent-safe)", background: busShortage ? "rgba(220, 38, 38, 0.1)" : "rgba(16, 185, 129, 0.1)", padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px", display: "inline-block", minWidth: "75px" }}>
                      {busShortage ? "SHORTAGE" : "AVAILABLE"}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-color)", background: ambulanceShortage ? "rgba(220, 38, 38, 0.05)" : "transparent" }}>
                  <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontWeight: 600 }}>Ambulances (ALS/BLS)</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-muted)", fontSize: "12px" }}>Vehicles</td>
                  <td style={{ padding: "12px 20px", color: ambulanceShortage ? "var(--accent-critical)" : "var(--text-primary)", fontWeight: 700, textAlign: "right", fontSize: "14px" }}>{vehicles.ambulances}</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontWeight: 700, textAlign: "right", fontSize: "14px" }}>{requiredAmbulances}</td>
                  <td style={{ padding: "12px 20px", textAlign: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: ambulanceShortage ? "var(--accent-critical)" : "var(--accent-safe)", background: ambulanceShortage ? "rgba(220, 38, 38, 0.1)" : "rgba(16, 185, 129, 0.1)", padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px", display: "inline-block", minWidth: "75px" }}>
                      {ambulanceShortage ? "SHORTAGE" : "AVAILABLE"}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontWeight: 600 }}>Rescue Trucks</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-muted)", fontSize: "12px" }}>Vehicles</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontWeight: 700, textAlign: "right", fontSize: "14px" }}>{vehicles.rescueTrucks}</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-muted)", fontWeight: 600, textAlign: "right", fontSize: "14px" }}>-</td>
                  <td style={{ padding: "12px 20px", textAlign: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-safe)", background: "rgba(16, 185, 129, 0.1)", padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px", display: "inline-block", minWidth: "75px" }}>
                      AVAILABLE
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontWeight: 600 }}>Medical Teams</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-muted)", fontSize: "12px" }}>Personnel</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontWeight: 700, textAlign: "right", fontSize: "14px" }}>{medical.active}</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-muted)", fontWeight: 600, textAlign: "right", fontSize: "14px" }}>+{medical.onCall} On-Call</td>
                  <td style={{ padding: "12px 20px", textAlign: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-emerald)", background: "rgba(52, 211, 153, 0.1)", padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px", display: "inline-block", minWidth: "75px" }}>
                      DEPLOYED
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontWeight: 600 }}>NDRF Units</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-muted)", fontSize: "12px" }}>Rescue</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontWeight: 700, textAlign: "right", fontSize: "14px" }}>{rescue.ndrfUnits}</td>
                  <td style={{ padding: "12px 20px", color: "var(--text-muted)", fontWeight: 600, textAlign: "right", fontSize: "14px" }}>-</td>
                  <td style={{ padding: "12px 20px", textAlign: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-blue)", background: "rgba(59, 130, 246, 0.1)", padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px", display: "inline-block", minWidth: "75px" }}>
                      STANDBY
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SUPPLIES & SHELTER STOCKS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Central Depot Reserves</h3>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Emergency supplies available for immediate dispatch</div>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>Drinking Water</span>
                <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>{supplies.waterStockLiters?.toLocaleString()} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>L</span></strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>Food Rations</span>
                <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>{supplies.foodRations?.toLocaleString()} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>Meals</span></strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>Blankets</span>
                <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>{supplies.blankets?.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>Backup Generators</span>
                <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>{supplies.generators} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>Units</span></strong>
              </div>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Shelter Deployed Stock</h3>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total supplies actively distributed across all safe sites</div>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>Water Deployed</span>
                <strong style={{ fontSize: "16px", color: "var(--accent-blue)" }}>{totalShelterWater.toLocaleString()} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>L</span></strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>Food Deployed</span>
                <strong style={{ fontSize: "16px", color: "var(--accent-emerald)" }}>{totalShelterFood.toLocaleString()} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>Meals</span></strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>Active Generators</span>
                <strong style={{ fontSize: "16px", color: "var(--accent-amber)" }}>{totalShelterGenerators} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>Units</span></strong>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ResourceManagementView;
