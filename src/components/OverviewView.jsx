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

  const sortedHabitations = [...(Array.isArray(habitations) ? habitations : [])].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));

  if (!hasHabitations && !hasSafeSites) {
    return (
      <div className="empty-state">
        No dashboard data is available right now. The backend may be offline or returning an empty response.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* STATS METRICS GRID */}
      <div className="stats-grid">
        <div className="stat-card danger">
          <div className="stat-label">
            <span>Population at Risk</span>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 100 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="stat-value">{safeStats.populationAtRisk.toLocaleString()}</div>
          <div className="stat-subtext">Across {habitations.length} vulnerable habitations</div>
        </div>

        <div className="stat-card danger">
          <div className="stat-label">
            <span>Red Zones</span>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="stat-value">{safeStats.redZonesCount}</div>
          <div className="stat-subtext">Immediate action required</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-label">
            <span>Safe Shelters</span>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div className="stat-value">{safeStats.safeSitesCount}</div>
          <div className="stat-subtext">Verified high-ground shelters</div>
        </div>

        <div className="stat-card success">
          <div className="stat-label">
            <span>Available Capacity</span>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-value">{safeStats.totalCapacity.toLocaleString()}</div>
          <div className="stat-subtext">+{safeStats.surplusCapacity} capacity surplus</div>
        </div>
      </div>

      {/* MAP PREVIEW & PRIORITY HABITATIONS */}
      <div className="grid-2-1">
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Regional Risk & Hazard Assessment</div>
              <div className="panel-sub">Real-time GIS hazard layers & vulnerable habitations</div>
            </div>
            <button className="action-btn" onClick={onNavigateToMap}>
              Expand Full Map
            </button>
          </div>

          <div
            style={{
              height: "360px",
              background: "#0f172a",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              cursor: "pointer"
            }}
            onClick={onNavigateToMap}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "radial-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px)",
                backgroundSize: "24px 24px"
              }}
            />

            <div style={{ zIndex: 2, textAlign: "center", padding: "20px" }}>
              <div className="pulse-red" style={{ display: "inline-block", padding: "12px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.2)", marginBottom: "12px" }}>
                <svg width="32" height="32" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 style={{ color: "#fff", fontSize: "18px", marginBottom: "6px" }}>GIS Map Radar Active</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", maxWidth: "340px", margin: "0 auto 16px" }}>
                Interactive map layers loaded: Flood buffer, Landslide hazard, Evacuation polylines, Safe sites.
              </p>
              <button className="action-btn primary" onClick={onNavigateToMap}>
                Open Interactive GIS Map
              </button>
            </div>
          </div>
        </div>

        {/* PRIORITY HABITATIONS LEADERBOARD */}
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Priority Habitations</div>
              <div className="panel-sub">Relocation queue by hazard rating</div>
            </div>
          </div>

          <div className="priority-list">
            {sortedHabitations.slice(0, 4).map((hab) => (
              <div
                key={hab.id}
                className="habitation-card-item"
                onClick={() => onSelectHabitation(hab)}
              >
                <div className="hab-info">
                  <h4>{hab.name}</h4>
                  <p>{hab.population} people • Risk Score: {hab.riskScore}/100</p>
                </div>
                <span className={`badge ${hab.hazardLevel === "Immediate" ? "immediate" : hab.hazardLevel === "Short-term" ? "short" : "medium"}`}>
                  {hab.hazardLevel}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-color)", textAlign: "center" }}>
            <button className="action-btn" style={{ width: "100%", justifyContent: "center" }} onClick={onNavigateToPlanner}>
              Launch Relocation Planner
            </button>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: RELOCATION PROGRESS & WORKFLOW */}
      <div className="grid-1-1">
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Evacuation & Relocation Progress</div>
              <div className="panel-sub">Live tracking of population transferred to safe havens</div>
            </div>
          </div>

          <div style={{ margin: "16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "8px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Relocation Target Achieved</span>
              <strong style={{ color: "var(--accent-cyan)" }}>
                {safeStats.relocatedCount} / {safeStats.populationAtRisk} ({Math.round((safeStats.relocatedCount / (safeStats.populationAtRisk || 1)) * 100)}%)
              </strong>
            </div>
            <div className="progress-bar-container" style={{ height: "12px" }}>
              <div className="progress-bar-fill" style={{ width: `${(safeStats.relocatedCount / (safeStats.populationAtRisk || 1)) * 100}%` }}></div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "20px" }}>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>EVACUATED</div>
              <strong style={{ fontSize: "18px", color: "var(--accent-emerald)" }}>{safeStats.relocatedCount}</strong>
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>IN TRANSIT</div>
              <strong style={{ fontSize: "18px", color: "var(--accent-amber)" }}>420</strong>
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>PENDING</div>
              <strong style={{ fontSize: "18px", color: "var(--accent-red)" }}>{Math.max(0, safeStats.populationAtRisk - safeStats.relocatedCount)}</strong>
            </div>
          </div>
        </div>

        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">System Execution Pipeline</div>
              <div className="panel-sub">Automated decision workflow</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
            {[
              { step: "01", title: "Hazard Detection", desc: "Flood & slope sensor metrics calculated", done: true },
              { step: "02", title: "Red Zone Demarcation", desc: "Buffer zones & high-risk habitations isolated", done: true },
              { step: "03", title: "Capacity Matching", desc: "Pair habitations to nearest available safe shelters", done: true },
              { step: "04", title: "Evacuation Dispatch", desc: "Live vehicle dispatch & route visualizer", done: false }
            ].map((st) => (
              <div key={st.step} style={{ display: "flex", alignItems: "center", gap: "14px", background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ background: st.done ? "var(--accent-blue)" : "rgba(255,255,255,0.1)", color: "#fff", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                  {st.step}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: "13px" }}>{st.title}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{st.desc}</div>
                </div>
                <span className={`badge ${st.done ? "safe" : "medium"}`}>
                  {st.done ? "COMPLETED" : "IN PROGRESS"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewView;
