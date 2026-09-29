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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="glass-panel" style={{ padding: "18px 22px" }}>
        <h2 className="panel-title">Resource Management & Logistics</h2>
        <p className="panel-sub">
          Centralized view of emergency vehicles, response teams, and relief supplies
        </p>
      </div>

      <div className="grid-2-1">
        {/* RESOURCE ALLOCATION TABLE */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="panel-header">
            <div>
              <div className="panel-title">Active Fleet & Personnel</div>
              <div className="panel-sub">Current availability of critical response resources</div>
            </div>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.05)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "10px", color: "var(--text-secondary)", fontWeight: 600 }}>Resource Type</th>
                  <th style={{ padding: "10px", color: "var(--text-secondary)", fontWeight: 600 }}>Category</th>
                  <th style={{ padding: "10px", color: "var(--text-secondary)", fontWeight: 600 }}>Available</th>
                  <th style={{ padding: "10px", color: "var(--text-secondary)", fontWeight: 600 }}>Required (Active)</th>
                  <th style={{ padding: "10px", color: "var(--text-secondary)", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "10px", color: "var(--text-primary)", fontWeight: 500 }}>Evacuation Buses</td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>Vehicles</td>
                  <td style={{ padding: "10px" }}><strong>{vehicles.buses}</strong></td>
                  <td style={{ padding: "10px" }}>{requiredBuses}</td>
                  <td style={{ padding: "10px" }}>
                    <span className={`badge ${busShortage ? "immediate" : "safe"}`}>
                      {busShortage ? "SHORTAGE" : "AVAILABLE"}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "10px", color: "var(--text-primary)", fontWeight: 500 }}>Ambulances (ALS/BLS)</td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>Vehicles</td>
                  <td style={{ padding: "10px" }}><strong>{vehicles.ambulances}</strong></td>
                  <td style={{ padding: "10px" }}>{requiredAmbulances}</td>
                  <td style={{ padding: "10px" }}>
                    <span className={`badge ${ambulanceShortage ? "immediate" : "safe"}`}>
                      {ambulanceShortage ? "SHORTAGE" : "AVAILABLE"}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "10px", color: "var(--text-primary)", fontWeight: 500 }}>Rescue Trucks</td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>Vehicles</td>
                  <td style={{ padding: "10px" }}><strong>{vehicles.rescueTrucks}</strong></td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>-</td>
                  <td style={{ padding: "10px" }}><span className="badge safe">AVAILABLE</span></td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "10px", color: "var(--text-primary)", fontWeight: 500 }}>Medical Teams</td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>Personnel</td>
                  <td style={{ padding: "10px" }}><strong>{medical.active} Active</strong></td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>+{medical.onCall} On-Call</td>
                  <td style={{ padding: "10px" }}><span className="badge safe">DEPLOYED</span></td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "10px", color: "var(--text-primary)", fontWeight: 500 }}>NDRF Units</td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>Rescue</td>
                  <td style={{ padding: "10px" }}><strong>{rescue.ndrfUnits} Units</strong></td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>-</td>
                  <td style={{ padding: "10px" }}><span className="badge medium">STANDBY</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SUPPLIES & SHELTER STOCKS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Central Depot Supplies</div>
                <div className="panel-sub">Emergency reserves</div>
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
              <div style={{ background: "rgba(0,0,0,0.03)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>Drinking Water</span>
                <strong style={{ fontSize: "20px", color: "var(--accent-blue)" }}>{supplies.waterStockLiters?.toLocaleString()} L</strong>
              </div>
              <div style={{ background: "rgba(0,0,0,0.03)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>Food Rations</span>
                <strong style={{ fontSize: "20px", color: "var(--accent-emerald)" }}>{supplies.foodRations?.toLocaleString()} Meals</strong>
              </div>
              <div style={{ background: "rgba(0,0,0,0.03)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>Blankets</span>
                <strong style={{ fontSize: "20px", color: "var(--text-primary)" }}>{supplies.blankets?.toLocaleString()}</strong>
              </div>
              <div style={{ background: "rgba(0,0,0,0.03)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>Backup Generators</span>
                <strong style={{ fontSize: "20px", color: "var(--accent-amber)" }}>{supplies.generators} Units</strong>
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Shelter Stock Aggregation</div>
                <div className="panel-sub">Total supplies pre-deployed at safe sites</div>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "rgba(0,0,0,0.02)", borderRadius: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Water Deployed:</span>
                <strong style={{ color: "var(--accent-blue)" }}>{totalShelterWater.toLocaleString()} L</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "rgba(0,0,0,0.02)", borderRadius: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Food Deployed:</span>
                <strong style={{ color: "var(--accent-emerald)" }}>{totalShelterFood.toLocaleString()} Meals</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "rgba(0,0,0,0.02)", borderRadius: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Active Generators:</span>
                <strong style={{ color: "var(--accent-amber)" }}>{totalShelterGenerators} Units</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResourceManagementView;
