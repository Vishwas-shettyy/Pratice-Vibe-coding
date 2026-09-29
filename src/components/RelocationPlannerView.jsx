import React, { useState } from "react";
import { api } from "../services/api";

function RelocationPlannerView({ habitations = [], safeSites = [], routes = [], onRefreshData }) {
  const [selectedHabitationId, setSelectedHabitationId] = useState((Array.isArray(habitations) ? habitations[0]?.id : "") || "");
  const [selectedShelterId, setSelectedShelterId] = useState("");
  const [statusInput, setStatusInput] = useState("In Progress");
  const [progressInput, setProgressInput] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const safeHabitations = Array.isArray(habitations) ? habitations : [];
  const safeSafeSites = Array.isArray(safeSites) ? safeSites : [];
  const safeRoutes = Array.isArray(routes) ? routes : [];

  const currentHabitation = safeHabitations.find((h) => h.id === selectedHabitationId) || safeHabitations[0] || {};
  const assignedShelter = safeSafeSites.find((s) => s.id === currentHabitation.assignedShelterId) || safeSafeSites[0] || {};
  const isAssigned = !!currentHabitation.assignedShelterId;

  // Form selections
  const shelterToAssign = safeSafeSites.find((s) => s.id === selectedShelterId) || safeSafeSites[0] || {};

  // Logistics calculations
  const busesRequired = Math.ceil((currentHabitation.population || 0) / 50);
  const ambulanceRequired = Math.ceil((currentHabitation.medicalPriority || 0) / 4);

  const handleAssign = async () => {
    if (!selectedHabitationId || !selectedShelterId) {
      setErrorMsg("Please select both a habitation and a shelter to assign.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await api.assignShelter(selectedHabitationId, selectedShelterId);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      setErrorMsg(err.message || "Failed to assign shelter.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedHabitationId) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await api.updateRelocationStatus(selectedHabitationId, statusInput, progressInput);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      setErrorMsg(err.message || "Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  if (!safeHabitations.length && !safeSafeSites.length && !safeRoutes.length) {
    return (
      <div className="empty-state">
        Relocation planning data is currently unavailable. The backend data feed is missing or offline.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* OPERATIONAL SUMMARY & HABITATION SELECTOR */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Routes</span>
              <strong style={{ fontSize: "20px", color: "var(--text-primary)" }}>{safeRoutes.length}</strong>
            </div>
            <div style={{ width: "1px", height: "32px", background: "var(--border-color)" }}></div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-warning)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pending Dispatch</span>
              <strong style={{ fontSize: "20px", color: "var(--accent-warning)" }}>{safeHabitations.filter(h => h.relocationStatus === 'Pending Dispatch').length}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", alignItems: "center", flex: 1, maxWidth: "640px", minWidth: "320px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>Target Operation:</span>
            <select
              value={selectedHabitationId}
              onChange={(e) => {
                setSelectedHabitationId(e.target.value);
                const newHab = safeHabitations.find((h) => h.id === e.target.value);
                setStatusInput(newHab?.relocationStatus || "Pending Dispatch");
                setProgressInput(newHab?.evacuationProgress || 0);
              }}
              disabled={loading}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                padding: "10px 14px",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontWeight: 600,
                outline: "none",
                width: "100%",
                cursor: "pointer"
              }}
            >
              {safeHabitations.map((h) => (
                <option key={h.id} value={h.id}>
                  [{h.code}] {h.name} — {h.riskLevel} PRIORITY
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: "rgba(220, 38, 38, 0.05)", border: "1px solid var(--accent-red)", padding: "12px 16px", borderRadius: "6px", color: "var(--accent-red)", fontSize: "13px", fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      <div className="grid-2-1">
        {/* LEFT COLUMN: MAIN WORKFLOW */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* DISPATCH FLOW (ORIGIN -> DESTINATION) */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 20px", background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border-color)", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Operational Logistics Flow
            </div>

            <div style={{ display: "flex", alignItems: "stretch", padding: "24px", gap: "24px" }}>

              {/* ORIGIN */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-critical)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 8px", background: "rgba(220, 38, 38, 0.1)", borderRadius: "4px" }}>
                  Origin Red Zone
                </span>
                <h4 style={{ fontSize: "18px", color: "var(--text-primary)", fontWeight: 700, margin: "4px 0 0 0" }}>{currentHabitation.name || "--"}</h4>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span>Population: <strong style={{ color: "var(--text-primary)" }}>{currentHabitation.population || 0}</strong></span>
                  <span>Risk: <strong style={{ color: "var(--accent-critical)" }}>{currentHabitation.riskScore || 0}/100</strong> ({currentHabitation.riskLevel || "LOW"})</span>
                </div>
              </div>

              {/* ARROW / DISTANCE */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", minWidth: "80px" }}>
                <div style={{ height: "1px", width: "40px", background: "var(--border-color)" }}></div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-blue)" }}>{currentHabitation.distanceToShelterKm || 0} km</div>
                <div style={{ fontSize: "16px", color: "var(--border-color)", fontWeight: 900 }}>&rarr;</div>
                <div style={{ height: "1px", width: "40px", background: "var(--border-color)" }}></div>
              </div>

              {/* DESTINATION */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-safe)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 8px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "4px" }}>
                  Destination Shelter
                </span>
                {isAssigned ? (
                  <>
                    <h4 style={{ fontSize: "18px", color: "var(--text-primary)", fontWeight: 700, margin: "4px 0 0 0" }}>{assignedShelter.name || "--"}</h4>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span>Beds Available: <strong style={{ color: "var(--accent-safe)" }}>{assignedShelter.available || 0}</strong></span>
                      <span>Total Capacity: {assignedShelter.capacity || 0}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, fontSize: "13px", fontWeight: 700, color: "var(--accent-warning)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Pending Assignment
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TRANSPORT LOGISTICS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Evacuation Buses</span>
              <strong style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--accent-blue)", lineHeight: 1, margin: "8px 0" }}>{busesRequired} <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Units</span></strong>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>50 seats / bus</div>
            </div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Ambulances</span>
              <strong style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--accent-red)", lineHeight: 1, margin: "8px 0" }}>{ambulanceRequired} <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Units</span></strong>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>For {currentHabitation.medicalPriority || 0} patients</div>
            </div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Est. Transit Time</span>
              <strong style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--accent-emerald)", lineHeight: 1, margin: "8px 0" }}>~{Math.round((currentHabitation.distanceToShelterKm || 0) * 4)} <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>mins</span></strong>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>Road: {currentHabitation.roadCondition || "Awaiting assessment"}</div>
            </div>
          </div>

          {/* ACTION AREA: ASSIGNMENT OR STATUS UPDATE */}
          {!isAssigned ? (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "20px 24px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Assign Safe Shelter</h4>
              <div style={{ display: "flex", gap: "16px" }}>
                <select
                  value={selectedShelterId}
                  onChange={(e) => setSelectedShelterId(e.target.value)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                    fontWeight: 500
                  }}
                >
                  <option value="">-- Select a Safe Shelter --</option>
                  {safeSafeSites.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Available: {s.available})</option>
                  ))}
                </select>
                <button
                  className="action-btn primary"
                  onClick={handleAssign}
                  disabled={loading || !selectedShelterId}
                  style={{ padding: "0 24px" }}
                >
                  {loading ? "Assigning..." : "Assign Shelter"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "24px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Evacuation Command</h4>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>CURRENT STATE:</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", padding: "4px 10px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{currentHabitation.relocationStatus}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Operation Phase</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    disabled={loading}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      color: "var(--text-primary)",
                      width: "100%",
                      fontSize: "13px",
                      fontWeight: 500,
                      outline: "none"
                    }}
                  >
                    <option value="Assigned">Assigned (Awaiting Dispatch)</option>
                    <option value="Pending Dispatch">Pending Dispatch</option>
                    <option value="In Progress">In Progress (Active Transit)</option>
                    <option value="Completed">Completed (Evacuated)</option>
                  </select>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Evacuation Progress</label>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{progressInput}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progressInput}
                    onChange={(e) => setProgressInput(e.target.value)}
                    disabled={loading}
                    style={{ width: "100%", accentColor: "var(--accent-blue)" }}
                  />
                </div>
              </div>

              <button
                className="action-btn primary"
                onClick={handleUpdateStatus}
                disabled={loading}
                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px" }}
              >
                {loading ? "Updating Operation..." : "Update Evacuation Status"}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACTIVE CORRIDORS */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border-color)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Dispatch Corridors</h3>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Live route utilization & vehicle metrics</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", padding: "16px", gap: "12px", overflowY: "auto" }}>
            {safeRoutes.map((rt) => {
              const status = String(rt.status || "");
              const isRerouting = status.includes("Reroute") || status.includes("Bypass");
              const statusColor = isRerouting ? "var(--accent-warning)" : status.includes("Active") ? "var(--accent-safe)" : "var(--accent-blue)";

              return (
                <div key={rt.id} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderLeft: `4px solid ${rt.color || "var(--accent-blue)"}`, padding: "14px", borderRadius: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
                      {rt.fromName} <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>to</span><br />
                      {rt.toName}
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: "4px" }}>
                      {rt.distance}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "8px", marginTop: "8px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600 }}>
                      <span style={{ color: "var(--text-primary)" }}>{rt.vehiclesAssigned}</span> vehicles active
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {status || "Unknown"}
                    </div>
                  </div>
                </div>
              );
            })}

            {safeRoutes.length === 0 && (
              <div style={{ padding: "24px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                No active dispatch corridors.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default RelocationPlannerView;
