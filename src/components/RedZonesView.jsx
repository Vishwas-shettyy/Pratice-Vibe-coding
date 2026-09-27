import React, { useState } from "react";

function RedZonesView({ habitations = [], onSelectHabitation, onUpdateStatus }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("ALL");

  const filteredHabitations = (habitations || []).filter((hab) => {
    const name = String(hab?.name || "");
    const code = String(hab?.code || "");
    const hazardType = String(hab?.hazardType || "");
    const hazardLevel = String(hab?.hazardLevel || "");

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hazardType.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterLevel === "ALL") return matchesSearch;
    return matchesSearch && hazardLevel.toUpperCase() === filterLevel.toUpperCase();
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* HEADER & FILTER BAR */}
      <div className="glass-panel" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 className="panel-title">Red Zones & Vulnerable Habitations</h2>
            <p className="panel-sub">
              Demographic vulnerability assessment, slope ratings, and interactive relocation status controls
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search village, code, hazard..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                padding: "8px 14px",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                minWidth: "220px"
              }}
            />

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                padding: "8px 14px",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none"
              }}
            >
              <option value="ALL">All Hazard Levels</option>
              <option value="IMMEDIATE">Immediate Threat</option>
              <option value="SHORT-TERM">Short-term</option>
              <option value="MEDIUM-TERM">Medium-term</option>
            </select>
          </div>
        </div>
      </div>

      {/* HABITATIONS CARDS GRID */}
      <div className="grid-3-col">
        {filteredHabitations.map((hab) => (
          <div key={hab.id} className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                  {hab.code}
                </span>
                <h3 style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: 700, marginTop: "2px" }}>
                  {hab.name}
                </h3>
              </div>
              <span className={`badge ${hab.hazardLevel === "Immediate" ? "immediate" : hab.hazardLevel === "Short-term" ? "short" : "medium"}`}>
                {hab.hazardLevel}
              </span>
            </div>

            <div style={{ background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Risk Score</span>
                <strong style={{ fontSize: "20px", color: hab.riskScore > 80 ? "var(--accent-red)" : "var(--accent-amber)" }}>
                  {hab.riskScore}/100
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Total Population</span>
                <strong style={{ fontSize: "20px", color: "var(--text-primary)" }}>{hab.population}</strong>
              </div>
            </div>

            {/* DEMOGRAPHICS BREAKDOWN */}
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Elderly (60+ yrs):</span>
                <strong style={{ color: "var(--text-primary)" }}>{hab.elderly}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Children (&lt;12 yrs):</span>
                <strong style={{ color: "var(--text-primary)" }}>{hab.children}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Medical Priority:</span>
                <strong style={{ color: "var(--accent-red)" }}>{hab.medicalPriority} patients</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Primary Hazard:</span>
                <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>{hab.hazardType}</span>
              </div>
            </div>

            {/* EVACUATION PROGRESS BAR */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-muted)" }}>Evacuation Status: <strong>{hab.relocationStatus}</strong></span>
                <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>{hab.evacuationProgress}%</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill success" style={{ width: `${hab.evacuationProgress}%` }}></div>
              </div>
            </div>

            {/* RELOCATION ACTION CONTROLS */}
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                className="action-btn primary"
                style={{ flex: 1, justifyContent: "center", fontSize: "12px" }}
                onClick={() => onSelectHabitation(hab)}
              >
                Inspect
              </button>

              <select
                value={hab.relocationStatus || "In Progress"}
                onChange={(e) => onUpdateStatus && onUpdateStatus(hab.id, e.target.value)}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  borderRadius: "8px",
                  padding: "6px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="Pending Dispatch">Pending Dispatch</option>
                <option value="In Progress">In Progress</option>
                <option value="Assigned">Assigned</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RedZonesView;
