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

  return (
    <div className="safe-sites-view" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* PAGE HEADER */}
      <div className="panel-header" style={{ marginBottom: "0", borderBottom: "none", paddingBottom: 0 }}>
        <div>
          <h2 className="page-title">Safe Sites & Relief Shelters</h2>
          <p className="page-description">
            Real-time shelter capacity tracking, medical readiness, and food/water inventory
          </p>
        </div>
        <button className="action-btn primary" style={{ flexShrink: 0 }}>
          + Register New Relief Shelter
        </button>
      </div>

      <div className="grid-1-1">
        {(safeShelters || []).map((shelter) => {
          const capacity = Math.max(shelter.capacity || 1, 1);
          const occupied = shelter.occupied || 0;
          const available = shelter.available || 0;
          const occupancyPct = Math.round((occupied / capacity) * 100);

          const isHighOccupancy = occupancyPct > 80;
          const statusText = (shelter.status || "UNKNOWN").toUpperCase();
          const isActive = statusText.includes("ACTIVE") || statusText.includes("READY");

          return (
            <div key={shelter.id} className="glass-panel" style={{ display: "flex", flexDirection: "column", padding: "0", overflow: "hidden" }}>

              {/* CARD HEADER */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      {shelter.code}
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0", lineHeight: 1.2 }}>
                      {shelter.name}
                    </h3>
                    <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      {shelter.type} • Elevation: {shelter.elevation}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", background: isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", color: isActive ? "var(--accent-safe)" : "var(--accent-warning)", padding: "4px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>
                    <span style={{ fontSize: "10px" }}>●</span> {statusText}
                  </div>
                </div>
              </div>

              {/* CAPACITY SECTION */}
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Capacity
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Total</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{capacity.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Occupied</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: isHighOccupancy ? "var(--accent-warning)" : "var(--text-primary)" }}>{occupied.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Available</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--accent-safe)" }}>{available.toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    <span>{occupancyPct}% Occupied</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "var(--bg-secondary)", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${occupancyPct}%`, background: isHighOccupancy ? "var(--accent-warning)" : "var(--accent-safe)", height: "100%" }} />
                  </div>
                </div>
              </div>

              {/* RESOURCES SECTION */}
              <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Resources
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px" }}>💧</span> Water
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {((shelter.waterStockLiters || 0) / 1000).toFixed(1)}k <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)", textTransform: "lowercase" }}>L</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px" }}>🍲</span> Food
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {Number(shelter.foodMealsStock || 0).toLocaleString()} <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)", textTransform: "lowercase" }}>meals</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px" }}>🩺</span> Medical
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {shelter.medicalTeams} <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)", textTransform: "lowercase" }}>teams</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px" }}>⚡</span> Power
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {shelter.powerGenerators} <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)", textTransform: "lowercase" }}>gensets</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER ACTION */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", borderBottomLeftRadius: "inherit", borderBottomRightRadius: "inherit" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {shelter.contact}
                </span>
                <button className="action-btn" style={{ fontSize: "13px", padding: "6px 14px" }} onClick={() => onSelectShelter(shelter)}>
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
