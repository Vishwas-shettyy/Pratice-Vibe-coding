import React, { useState } from "react";

function RelocationPlannerView({ habitations, safeSites, routes }) {
  const [selectedHabitationId, setSelectedHabitationId] = useState(habitations[0]?.id || "");

  const currentHabitation = habitations.find((h) => h.id === selectedHabitationId) || habitations[0];
  const assignedShelter = safeSites.find((s) => s.id === currentHabitation.assignedShelterId) || safeSites[0];

  // Bus calculation (50 people per bus)
  const busesRequired = Math.ceil(currentHabitation.population / 50);
  const ambulanceRequired = Math.ceil(currentHabitation.medicalPriority / 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="glass-panel" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="panel-title">AI Relocation & Safe Route Optimization</h2>
            <p className="panel-sub">
              Algorithmic paired allocation between Red Zones and nearest verified Safe Shelters
            </p>
          </div>
          <button className="action-btn primary pulse-red">
            Auto-Generate Evacuation Dispatch Plan
          </button>
        </div>
      </div>

      <div className="grid-2-1">
        {/* ROUTE MAPPING DETAILS */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: "#fff", fontSize: "16px" }}>Select Red Zone Habitation</h3>
            <select
              value={selectedHabitationId}
              onChange={(e) => setSelectedHabitationId(e.target.value)}
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border-color)",
                padding: "8px 12px",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px"
              }}
            >
              {habitations.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.population} people)
                </option>
              ))}
            </select>
          </div>

          {/* PAIRING VISUALIZER CARD */}
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color-glow)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <div style={{ flex: 1, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", padding: "14px", borderRadius: "10px" }}>
                <span className="badge immediate">ORIGIN (RED ZONE)</span>
                <h4 style={{ color: "#fff", fontSize: "16px", marginTop: "6px" }}>{currentHabitation.name}</h4>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Pop: {currentHabitation.population} | Risk: {currentHabitation.riskScore}/100
                </div>
              </div>

              <div style={{ color: "var(--accent-cyan)", fontSize: "20px", fontWeight: 700, textAlign: "center" }}>
                &rarr;
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{currentHabitation.distanceToShelterKm} km</div>
              </div>

              <div style={{ flex: 1, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "14px", borderRadius: "10px" }}>
                <span className="badge safe">DESTINATION (SAFE SHELTER)</span>
                <h4 style={{ color: "#fff", fontSize: "16px", marginTop: "6px" }}>{assignedShelter.name}</h4>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Beds Available: {assignedShelter.available} / {assignedShelter.capacity}
                </div>
              </div>
            </div>
          </div>

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
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>For {currentHabitation.medicalPriority} patients</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Transit Time</span>
              <strong style={{ fontSize: "22px", color: "var(--accent-emerald)" }}>~{Math.round(currentHabitation.distanceToShelterKm * 4)} mins</strong>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>Road: {currentHabitation.roadCondition}</div>
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
            {routes.map((rt) => (
              <div key={rt.id} style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px", borderLeft: `4px solid ${rt.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "#fff", fontSize: "13px" }}>{rt.fromName} &rarr; {rt.toName}</strong>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{rt.distance}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>
                  <span>Vehicles: {rt.vehiclesAssigned} active</span>
                  <span style={{ color: rt.status.includes("Active") ? "var(--accent-emerald)" : "var(--accent-amber)" }}>{rt.status}</span>
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
