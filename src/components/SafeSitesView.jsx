import React from "react";

function SafeSitesView({ safeSites = [], onSelectShelter }) {
  const safeShelters = Array.isArray(safeSites) ? safeSites : [];

  if (!safeShelters.length) {
    return (
      <div className="empty-state">
        No safe-site data is available right now. Please retry once the backend is reachable.
      </div>
    );
  }

  // Aggregate metrics
  const totalSites = safeShelters.length;
  const totalCapacity = safeShelters.reduce((acc, s) => acc + Math.max(s.capacity || 1, 1), 0);
  const totalAvailable = safeShelters.reduce((acc, s) => acc + (s.available || 0), 0);
  const activeCount = safeShelters.filter(s => (s.status || "").toUpperCase().includes("ACTIVE") || (s.status || "").toUpperCase().includes("READY")).length;

  return (
    <div className="safe-sites-view" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* PAGE HEADER & SUMMARY STRIP */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 className="page-title" style={{ margin: "0 0 4px 0", fontSize: "20px" }}>Safe Sites & Relief Shelters</h2>
            <p className="page-description" style={{ margin: 0 }}>
              Real-time shelter capacity tracking, medical readiness, and food/water inventory
            </p>
          </div>
          <button className="action-btn primary" style={{ flexShrink: 0, padding: "8px 16px" }}>
            + Register New Relief Shelter
          </button>
        </div>

        <div style={{ display: "flex", gap: "24px", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Verified Sites</span>
            <strong style={{ fontSize: "20px", color: "var(--text-primary)" }}>{totalSites}</strong>
          </div>
          <div style={{ width: "1px", height: "32px", background: "var(--border-color)" }}></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-safe)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Shelters</span>
            <strong style={{ fontSize: "20px", color: "var(--accent-safe)" }}>{activeCount}</strong>
          </div>
          <div style={{ width: "1px", height: "32px", background: "var(--border-color)" }}></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Network Capacity</span>
            <strong style={{ fontSize: "20px", color: "var(--text-primary)" }}>{totalCapacity.toLocaleString()}</strong>
          </div>
          <div style={{ width: "1px", height: "32px", background: "var(--border-color)" }}></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Available Beds</span>
            <strong style={{ fontSize: "20px", color: "var(--accent-blue)" }}>{totalAvailable.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* SHELTER CARDS */}
      <div className="grid-1-1">
        {safeShelters.map((shelter) => {
          const capacity = Math.max(shelter.capacity || 1, 1);
          const occupied = shelter.occupied || 0;
          const available = shelter.available || 0;
          const occupancyPct = Math.round((occupied / capacity) * 100);

          const isHighOccupancy = occupancyPct > 85;
          const isFull = occupancyPct >= 100;
          const statusText = (shelter.status || "UNKNOWN").toUpperCase();
          const isActive = statusText.includes("ACTIVE") || statusText.includes("READY");

          const statusColor = isFull ? "var(--accent-critical)" : isActive ? "var(--accent-safe)" : "var(--accent-warning)";

          return (
            <div key={shelter.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "6px", display: "flex", flexDirection: "column" }}>

              {/* CARD HEADER */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "4px", fontFamily: "var(--font-mono)" }}>
                      {shelter.code}
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px 0", lineHeight: 1.2 }}>
                      {shelter.name}
                    </h3>

                    {/* SITE SUITABILITY INFORMATION */}
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>{shelter.type}</span>
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--border-color)" }}></span>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>Elevation: {shelter.elevation}</span>
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--border-color)" }}></span>
                      <span style={{ fontSize: "12px", color: "var(--accent-blue)", fontWeight: 700 }}>HIGH-GROUND SECURE</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", background: isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", padding: "4px 10px", borderRadius: "4px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor }}></div>
                    <span style={{ color: statusColor, fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px" }}>{statusText}</span>
                  </div>
                </div>
              </div>

              {/* CARRYING CAPACITY */}
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Carrying Capacity
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                  <div style={{ background: "var(--bg-secondary)", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px", fontWeight: 600 }}>Total</div>
                    <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1 }}>{capacity.toLocaleString()}</div>
                  </div>
                  <div style={{ background: "var(--bg-secondary)", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px", fontWeight: 600 }}>Occupied</div>
                    <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-display)", color: isHighOccupancy ? "var(--accent-warning)" : "var(--text-primary)", lineHeight: 1 }}>{occupied.toLocaleString()}</div>
                  </div>
                  <div style={{ background: "rgba(59, 130, 246, 0.05)", padding: "12px", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", color: "var(--accent-blue)", textTransform: "uppercase", marginBottom: "4px", fontWeight: 700 }}>Available</div>
                    <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--accent-blue)", lineHeight: 1 }}>{available.toLocaleString()}</div>
                  </div>
                </div>

                {/* CAPACITY READINESS PROGRESS */}
                <div style={{ marginTop: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    <span>Occupancy Readiness</span>
                    <span style={{ color: isHighOccupancy ? "var(--accent-warning)" : "var(--text-secondary)" }}>{occupancyPct}%</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "var(--border-color)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(occupancyPct, 100)}%`, background: isHighOccupancy ? "var(--accent-warning)" : "var(--accent-safe)", height: "100%" }} />
                  </div>
                </div>
              </div>

              {/* RESOURCES INVENTORY */}
              <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Resource Readiness
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px", fontWeight: 600 }}>Water</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {((shelter.waterStockLiters || 0) / 1000).toFixed(1)}k <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>L</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px", fontWeight: 600 }}>Food</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {Number(shelter.foodMealsStock || 0).toLocaleString()} <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>meals</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px", fontWeight: 600 }}>Medical</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {shelter.medicalTeams} <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>teams</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px", fontWeight: 600 }}>Power</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {shelter.powerGenerators} <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>gensets</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER ACTION */}
              <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border-color)", background: "var(--bg-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
                  Contact: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{shelter.contact}</span>
                </span>
                <button
                  className="action-btn"
                  style={{ fontSize: "12px", padding: "6px 14px", background: "transparent", border: "1px solid var(--border-color)", fontWeight: 600 }}
                  onClick={() => onSelectShelter(shelter)}
                >
                  Inspect Details
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SafeSitesView;
