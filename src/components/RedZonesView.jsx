import React, { useState } from "react";

function RedZonesView({ habitations = [], onSelectHabitation, onUpdateStatus, simulationResult, onClearScenario }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("ALL");

  const safeHabitations = Array.isArray(habitations) ? habitations : [];

  const getRiskScore = (hab) => Number(hab?.riskScore ?? hab?.risk_score ?? hab?.risk_assessment?.risk_score ?? 0);
  const getRiskLevel = (hab) => String(hab?.riskLevel ?? hab?.risk_level ?? hab?.risk_assessment?.risk_level ?? "LOW").toUpperCase();

  const filteredHabitations = safeHabitations.filter((hab) => {
    const name = String(hab?.name || "");
    const code = String(hab?.code || "");
    const hazardType = String(hab?.hazardType || "");
    const hazardLevel = String(hab?.hazardLevel || "").toUpperCase();
    const riskLevel = getRiskLevel(hab);

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hazardType.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterLevel === "ALL") return matchesSearch;
    return matchesSearch && (hazardLevel === filterLevel || riskLevel === filterLevel);
  });

  // Calculate Summary metrics
  const isHarsh = simulationResult?.scenario?.id === "KODAGU_EXTREME_MONSOON_HARSH_CASE" || simulationResult?.scenario?.label === "HARSH CASE";
  const immediateCount = simulationResult?.relocations
    ? simulationResult.relocations.filter(r => r.priority === 'CRITICAL').length
    : safeHabitations.filter(h => String(h?.hazardLevel || "").toUpperCase() === "IMMEDIATE").length;
  const shortTermCount = simulationResult?.relocations
    ? simulationResult.relocations.filter(r => r.priority === 'HIGH' || r.priority === 'MODERATE').length
    : safeHabitations.filter(h => String(h?.hazardLevel || "").toUpperCase() === "SHORT-TERM").length;
  const mediumTermCount = simulationResult?.relocations
    ? 0
    : safeHabitations.filter(h => String(h?.hazardLevel || "").toUpperCase() === "MEDIUM-TERM").length;
  const totalCount = simulationResult?.relocations ? simulationResult.relocations.length : safeHabitations.length;

  const renderBanner = () => {
    if (!simulationResult) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: isHarsh ? "rgba(220, 38, 38, 0.08)" : "rgba(168, 85, 247, 0.1)", border: `1px solid ${isHarsh ? "rgba(220, 38, 38, 0.4)" : "#a855f7"}`, borderRadius: "8px", padding: "14px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: isHarsh ? "var(--accent-critical)" : "#a855f7", fontWeight: 700, fontSize: "13px", letterSpacing: "0.5px" }}>
            {isHarsh ? "HARSH CASE SIMULATION ACTIVE — 16 AFFECTED SETTLEMENTS (15 CRITICAL, 1 MODERATE)" : "SCENARIO RESULT OVERLAY ACTIVE — SHOWING AFFECTED SETTLEMENTS"}
          </div>
          <button className="action-btn" onClick={onClearScenario} style={{ border: `1px solid ${isHarsh ? "var(--accent-critical)" : "#a855f7"}`, color: isHarsh ? "var(--accent-critical)" : "#a855f7", background: "transparent", padding: "4px 10px", fontSize: "12px" }}>
            Exit Scenario
          </button>
        </div>
        {isHarsh && (
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            HARSH CASE is a deterministic simulation used to demonstrate ResQ response under extreme disaster conditions. Results are simulated and do not represent a live hazard forecast.
          </div>
        )}
      </div>
    );
  };

  if (!filteredHabitations.length && !searchTerm && !simulationResult) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {renderBanner()}
        <div className="empty-state" style={{ padding: "40px", textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-muted)" }}>
          Real Kodagu settlement operational risk data is not currently available.
          <br/>
          Run a scenario from the Hazard Simulator to view deterministic relocation outcomes.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {renderBanner()}
      
      {/* OPERATIONAL SUMMARY & FILTER BAR */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>

          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid var(--border-color)", paddingRight: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Zones</span>
              <strong style={{ fontSize: "20px", color: "var(--text-primary)" }}>{totalCount}</strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-critical)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Immediate Horizon</span>
              <strong style={{ fontSize: "20px", color: "var(--accent-critical)" }}>{immediateCount}</strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-warning)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Short-term Horizon</span>
              <strong style={{ fontSize: "20px", color: "var(--accent-warning)" }}>{shortTermCount}</strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Medium-term Horizon</span>
              <strong style={{ fontSize: "20px", color: "var(--text-primary)" }}>{mediumTermCount}</strong>
            </div>
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
                padding: "8px 12px",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                minWidth: "240px",
                fontWeight: 500
              }}
            />

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                padding: "8px 12px",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >
              <option value="ALL">All Horizons</option>
              <option value="IMMEDIATE">Immediate Threat</option>
              <option value="SHORT-TERM">Short-term</option>
              <option value="MEDIUM-TERM">Medium-term</option>
            </select>
          </div>
        </div>
      </div>

      {/* HABITATIONS CARDS GRID */}
      <div className="grid-3-col">
        {simulationResult ? (
          simulationResult.relocations?.map((rel) => {
            const hab = safeHabitations.find(h => h.id === rel.settlement_id) || { name: rel.settlement_id, code: "UNKNOWN" };
            const isCrit = rel.priority === "CRITICAL";
            const riskColor = isCrit ? "var(--accent-critical)" : "var(--accent-warning)";
            
            return (
              <div key={rel.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "6px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{hab.code}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: riskColor }}></div>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: riskColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>{rel.priority} PRIORITY</span>
                  </div>
                </div>
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", color: "var(--text-primary)", fontWeight: 700, margin: "0 0 4px 0" }}>{hab.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>Scenario Exposure:</span>
                        <span style={{ fontSize: "12px", color: riskColor, fontWeight: 700 }}>HIGH</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{ background: "rgba(0,0,0,0.02)", padding: "8px 12px", borderBottom: "1px solid var(--border-color)", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Relocation Assignment
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px", background: "var(--bg-secondary)", fontSize: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Destination:</span>
                        <strong style={{ color: "var(--text-primary)" }}>{rel.recommended_site_id || "None"}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Route Status:</span>
                        <strong style={{ color: rel.route_status === "SUCCESS" ? "var(--accent-safe)" : "var(--accent-critical)" }}>{rel.route_status}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: "auto", paddingTop: "8px", fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", textAlign: "right" }}>
                    Data Status: {isHarsh ? "HARSH CASE / SCENARIO" : rel.data_status}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          filteredHabitations.map((hab) => {
          const riskScore = getRiskScore(hab);
          const riskLevel = getRiskLevel(hab);

          const isCritical = riskLevel === "CRITICAL";
          const isHigh = riskLevel === "HIGH";
          const riskColor = isCritical ? "var(--accent-critical)" : isHigh ? "var(--accent-warning)" : "var(--accent-blue)";

          const horizon = String(hab.hazardLevel || "").toUpperCase();
          const isImmediate = horizon === "IMMEDIATE";
          const isShort = horizon === "SHORT-TERM";
          const horizonColor = isImmediate ? "var(--accent-critical)" : isShort ? "var(--accent-warning)" : "var(--accent-blue)";

          const statusColors = {
            "Ready": "var(--text-muted)",
            "Pending Dispatch": "var(--accent-warning)",
            "In Progress": "var(--accent-blue)",
            "Assigned": "var(--accent-safe)",
            "Completed": "var(--accent-emerald)"
          };
          const currentStatusColor = statusColors[hab.relocationStatus] || "var(--accent-blue)";

          return (
            <div key={hab.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "6px", display: "flex", flexDirection: "column" }}>

              {/* TOP STRIP - RELOCATION HORIZON */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{hab.code}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: horizonColor }}></div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: horizonColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>{horizon} PRIORITY</span>
                </div>
              </div>

              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>

                {/* TITLE & RISK SCORE */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", color: "var(--text-primary)", fontWeight: 700, margin: "0 0 4px 0" }}>{hab.name}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>Primary Threat:</span>
                      <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 700 }}>{hab.hazardType}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                      <strong style={{ fontSize: "24px", color: riskColor, lineHeight: 1 }}>{riskScore}</strong>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>/100</span>
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: riskColor, letterSpacing: "0.5px", marginTop: "4px" }}>{riskLevel} RISK</span>
                  </div>
                </div>

                {/* VULNERABILITY METRICS */}
                <div style={{ border: "1px solid var(--border-color)", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ background: "rgba(0,0,0,0.02)", padding: "8px 12px", borderBottom: "1px solid var(--border-color)", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Vulnerable Population: {hab.population} Total
                  </div>
                  <div style={{ display: "flex", padding: "12px", gap: "16px", background: "var(--bg-secondary)" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "2px" }}>Elderly (60+)</span>
                      <strong style={{ fontSize: "15px", color: "var(--text-primary)" }}>{hab.elderly}</strong>
                    </div>
                    <div style={{ width: "1px", background: "var(--border-color)" }}></div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "2px" }}>Children (&lt;12)</span>
                      <strong style={{ fontSize: "15px", color: "var(--text-primary)" }}>{hab.children}</strong>
                    </div>
                    <div style={{ width: "1px", background: "var(--border-color)" }}></div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "11px", color: "var(--accent-red)", marginBottom: "2px", fontWeight: 600 }}>Medical</span>
                      <strong style={{ fontSize: "15px", color: "var(--accent-red)" }}>{hab.medicalPriority}</strong>
                    </div>
                  </div>
                </div>

                {/* EVACUATION PROGRESS */}
                <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>Evacuation Progress</span>
                      <span style={{ fontSize: "12px", color: currentStatusColor, fontWeight: 700 }}>{hab.relocationStatus}</span>
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{hab.evacuationProgress}%</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--border-color)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${hab.evacuationProgress}%`, height: "100%", background: currentStatusColor }}></div>
                  </div>
                </div>

                {/* RELOCATION ACTION CONTROLS */}
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    className="action-btn"
                    style={{ flex: 1, justifyContent: "center", fontSize: "12px", background: "transparent" }}
                    onClick={() => onSelectHabitation(hab)}
                  >
                    Inspect Profile
                  </button>

                  <select
                    value={hab.relocationStatus || "Pending Dispatch"}
                    onChange={(e) => onUpdateStatus && onUpdateStatus(hab.id, e.target.value)}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      borderRadius: "4px",
                      padding: "0 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      outline: "none"
                    }}
                  >
                    <option value="Ready">Ready</option>
                    <option value="Pending Dispatch">Pending Dispatch</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
}

export default RedZonesView;
