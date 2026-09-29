import React from "react";

function OverviewView({
  stats = {},
  habitations = [],
  safeSites = [],
  onSelectHabitation,
  onNavigateToMap,
  onNavigateToPlanner
}) {
  const hasHabitations = Array.isArray(habitations) && habitations.length > 0;
  const hasSafeSites = Array.isArray(safeSites) && safeSites.length > 0;
  const safeStats = {
    ...stats,
    populationAtRisk: Number(stats.populationAtRisk ?? stats.totalPopulationAtRisk ?? 0),
    redZonesCount: Number(stats.redZonesCount ?? 0),
    safeSitesCount: Number(stats.safeSitesCount ?? safeSites.length ?? 0),
    totalCapacity: Number(stats.totalCapacity ?? 0),
    relocatedCount: Number(stats.relocatedCount ?? 0),
    surplusCapacity: Number(stats.surplusCapacity ?? stats.availableCapacity ?? 0),
  };

  const getHabitRiskScore = (hab) => Number(hab?.riskScore ?? hab?.risk_score ?? hab?.risk_assessment?.risk_score ?? 0);
  const getHabitRiskLevel = (hab) => String(hab?.riskLevel ?? hab?.risk_level ?? hab?.risk_assessment?.risk_level ?? "LOW").toUpperCase();

  const sortedHabitations = [...(Array.isArray(habitations) ? habitations : [])].sort((a, b) => getHabitRiskScore(b) - getHabitRiskScore(a));

  if (!hasHabitations && !hasSafeSites) {
    return (
      <div className="empty-state">
        No dashboard data is available right now. The backend may be offline or returning an empty response.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* KPI COMMAND STRIP */}
      <div className="stats-grid">
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", borderTop: "3px solid var(--accent-critical)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Population at Risk</span>
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>👥</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.2 }}>
            {safeStats.populationAtRisk.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Across {habitations.length} vulnerable habitations
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", borderTop: "3px solid var(--accent-critical)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Red Zones</span>
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>📍</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.2 }}>
            {safeStats.redZonesCount}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Immediate action required
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", borderTop: "3px solid var(--accent-warning)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Safe Shelters</span>
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>🛡️</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.2 }}>
            {safeStats.safeSitesCount}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Verified high-ground shelters
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", borderTop: "3px solid var(--accent-safe)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Available Capacity</span>
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>🛏️</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.2 }}>
            {safeStats.totalCapacity.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--accent-safe)", fontWeight: 600 }}>
            +{safeStats.surplusCapacity} capacity surplus
          </div>
        </div>
      </div>

      {/* REGIONAL RISK & PRIORITY HABITATIONS */}
      <div className="grid-2-1">
        {/* GIS LAUNCH PANEL */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", padding: "0", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Regional Risk & Hazard Assessment</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Real-time GIS hazard layers & vulnerable habitations</p>
          </div>

          <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-secondary)", position: "relative" }}>
            {/* Grid background effect */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(var(--border-color) 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.5 }} />

            <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="pulse-red" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-red)", display: "inline-block" }}></span>
                <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--accent-red)" }}>GIS STATUS: LIVE</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Hazard Layers</div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>Flood • Landslide • Evacuation • Safe Sites</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Habitations Monitored</div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{habitations.length} High-Risk Zones</div>
                </div>
              </div>

              <div style={{ marginTop: "auto", paddingTop: "12px" }}>
                <button className="action-btn primary" style={{ padding: "10px 20px" }} onClick={onNavigateToMap}>
                  Open Interactive GIS Map
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PRIORITY QUEUE */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", padding: "0", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Priority Habitations</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Relocation queue by hazard rating</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {sortedHabitations.slice(0, 4).map((hab, index) => {
              const riskLevel = getHabitRiskLevel(hab);
              const isCritical = riskLevel === "CRITICAL" || riskLevel === "IMMEDIATE";
              const isHigh = riskLevel === "HIGH" || riskLevel === "SHORT-TERM";
              const statusColor = isCritical ? "var(--accent-critical)" : isHigh ? "var(--accent-warning)" : "var(--accent-blue)";

              return (
                <div key={hab.id} onClick={() => onSelectHabitation(hab)} style={{ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--border-color)", cursor: "pointer", transition: "background 0.2s ease" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-secondary)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", width: "24px", marginRight: "12px" }}>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>{hab.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{hab.population} people</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{getHabitRiskScore(hab)} <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>/ 100</span></div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {riskLevel}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ padding: "16px 24px", background: "rgba(0,0,0,0.02)", textAlign: "center", marginTop: "auto" }}>
            <button className="action-btn" style={{ width: "100%", justifyContent: "center", fontSize: "13px" }} onClick={onNavigateToPlanner}>
              Launch Relocation Planner
            </button>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: RELOCATION PROGRESS & WORKFLOW */}
      <div className="grid-1-1">

        {/* RELOCATION PROGRESS */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Evacuation & Relocation Progress</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Live tracking of population transferred to safe havens</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-secondary)", padding: "20px", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Relocation Target</div>
                <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  {safeStats.relocatedCount.toLocaleString()} <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 500 }}>/ {safeStats.populationAtRisk.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-blue)" }}>
                {Math.round((safeStats.relocatedCount / (safeStats.populationAtRisk || 1)) * 100)}%
              </div>
            </div>

            <div style={{ width: "100%", height: "8px", background: "rgba(0,0,0,0.06)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${(safeStats.relocatedCount / (safeStats.populationAtRisk || 1)) * 100}%`, height: "100%", background: "var(--accent-blue)" }}></div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Evacuated</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-safe)" }}>{safeStats.relocatedCount.toLocaleString()}</div>
            </div>
            <div style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>In Transit</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-warning)" }}>420</div>
            </div>
            <div style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pending</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>{Math.max(0, safeStats.populationAtRisk - safeStats.relocatedCount).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* SYSTEM EXECUTION PIPELINE */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>System Execution Pipeline</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Automated decision workflow</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { step: "01", title: "Hazard Detection", desc: "Flood & slope sensor metrics calculated", done: true },
              { step: "02", title: "Red Zone Demarcation", desc: "Buffer zones & high-risk habitations isolated", done: true },
              { step: "03", title: "Capacity Matching", desc: "Pair habitations to nearest available safe shelters", done: true },
              { step: "04", title: "Evacuation Dispatch", desc: "Live vehicle dispatch & route visualizer", done: false }
            ].map((st) => (
              <div key={st.step} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-secondary)" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: st.done ? "var(--text-secondary)" : "var(--text-muted)", width: "16px" }}>
                  {st.step}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{st.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{st.desc}</div>
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: st.done ? "var(--accent-safe)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", background: st.done ? "rgba(16, 185, 129, 0.1)" : "rgba(0,0,0,0.05)", padding: "4px 8px", borderRadius: "4px" }}>
                  {st.done ? "COMPLETED" : "IN PROGRESS"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewView;
