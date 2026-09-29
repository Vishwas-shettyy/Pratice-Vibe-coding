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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="glass-panel" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="panel-title">Relocation & Evacuation Workflow</h2>
            <p className="panel-sub">
              Manage shelter assignment and track evacuation progress for high-risk zones
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="glass-panel" style={{ padding: "12px 16px", borderColor: "var(--accent-red)" }}>
          <div style={{ color: "var(--accent-red)" }}>{errorMsg}</div>
        </div>
      )}

      <div className="grid-2-1">
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Habitation Selection */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: "var(--text-primary)", fontSize: "16px" }}>Select High-Risk Habitation</h3>
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
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border-color)",
                padding: "8px 12px",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "13px"
              }}
            >
              {safeHabitations.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.riskLevel} - {h.riskScore})
                </option>
              ))}
            </select>
          </div>

          <div style={{ background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color-glow)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <div style={{ flex: 1, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", padding: "14px", borderRadius: "10px" }}>
                <span className="badge immediate">ORIGIN (RED ZONE)</span>
                <h4 style={{ color: "var(--text-primary)", fontSize: "16px", marginTop: "6px" }}>{currentHabitation.name || "No habitation selected"}</h4>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Pop: {currentHabitation.population || 0} | Risk: {currentHabitation.riskScore || 0}/100
                </div>
              </div>

              <div style={{ color: "var(--accent-cyan)", fontSize: "20px", fontWeight: 700, textAlign: "center" }}>
                &rarr;
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{currentHabitation.distanceToShelterKm || 0} km</div>
              </div>

              <div style={{ flex: 1, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "14px", borderRadius: "10px" }}>
                <span className="badge safe">DESTINATION (SAFE SHELTER)</span>
                {isAssigned ? (
                  <>
                    <h4 style={{ color: "var(--text-primary)", fontSize: "16px", marginTop: "6px" }}>{assignedShelter.name || "No shelter assigned"}</h4>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      Beds Available: {assignedShelter.available || 0} / {assignedShelter.capacity || 0}
                    </div>
                  </>
                ) : (
                  <div style={{ marginTop: "6px", color: "var(--accent-amber)", fontSize: "14px", fontWeight: "bold" }}>Pending Assignment</div>
                )}
              </div>
            </div>
          </div>

          {!isAssigned && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <h4 style={{ color: "var(--text-primary)", fontSize: "14px" }}>Assign a Shelter</h4>
              <select
                value={selectedShelterId}
                onChange={(e) => setSelectedShelterId(e.target.value)}
                disabled={loading}
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-color)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  width: "100%"
                }}
              >
                <option value="">-- Select a Safe Shelter --</option>
                {safeSafeSites.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Avail: {s.available})</option>
                ))}
              </select>
              <button
                className="action-btn primary pulse-red"
                onClick={handleAssign}
                disabled={loading || !selectedShelterId}
              >
                {loading ? "Assigning..." : "Assign Relocation Shelter"}
              </button>
            </div>
          )}

          {isAssigned && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <h4 style={{ color: "var(--text-primary)", fontSize: "14px", display: "flex", justifyContent: "space-between" }}>
                <span>Update Evacuation Status</span>
                <span className="badge safe">{currentHabitation.relocationStatus}</span>
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Status</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    disabled={loading}
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--border-color)",
                      padding: "8px",
                      borderRadius: "6px",
                      color: "var(--text-primary)",
                      width: "100%"
                    }}
                  >
                    <option value="Assigned">Assigned</option>
                    <option value="Pending Dispatch">Pending Dispatch</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={progressInput}
                    onChange={(e) => setProgressInput(e.target.value)}
                    disabled={loading}
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--border-color)",
                      padding: "8px",
                      borderRadius: "6px",
                      color: "var(--text-primary)",
                      width: "100%"
                    }}
                  />
                </div>
              </div>
              <button
                className="action-btn primary"
                onClick={handleUpdateStatus}
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Status & Progress"}
              </button>
            </div>
          )}

          {/* LOGISTICS REQUIREMENTS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Evacuation Buses</span>
              <strong style={{ fontSize: "22px", color: "var(--accent-blue)" }}>{busesRequired} Units</strong>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>50 seats / bus</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Ambulances</span>
              <strong style={{ fontSize: "22px", color: "var(--accent-red)" }}>{ambulanceRequired} Units</strong>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>For {currentHabitation.medicalPriority || 0} patients</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Transit Time</span>
              <strong style={{ fontSize: "22px", color: "var(--accent-emerald)" }}>~{Math.round((currentHabitation.distanceToShelterKm || 0) * 4)} mins</strong>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>Road: {currentHabitation.roadCondition || "Awaiting assessment"}</div>
            </div>
          </div>
        </div>

        {/* ACTIVE DISPATCH ROUTES */}
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Active Dispatch Corridors</div>
              <div className="panel-sub">Evacuation polylines & vehicle count</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {safeRoutes.map((rt) => (
              <div key={rt.id} style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", borderLeft: `4px solid ${rt.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "var(--text-primary)", fontSize: "13px" }}>{rt.fromName} &rarr; {rt.toName}</strong>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{rt.distance}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>
                  <span>Vehicles: {rt.vehiclesAssigned} active</span>
                  <span style={{ color: String(rt.status || "").includes("Active") ? "var(--accent-emerald)" : "var(--accent-amber)" }}>{rt.status || "Unknown"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RelocationPlannerView;
