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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="glass-panel" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="panel-title">Safe Sites & Relief Shelters</h2>
            <p className="panel-sub">
              Real-time shelter capacity tracking, medical readiness, and food/water inventory
            </p>
          </div>
          <button className="action-btn primary">
            + Register New Relief Shelter
          </button>
        </div>
      </div>

      <div className="grid-1-1">
        {(safeShelters || []).map((shelter) => {
          const occupancyPct = Math.round(((shelter.occupied || 0) / Math.max((shelter.capacity || 0), 1)) * 100);

          return (
            <div key={shelter.id} className="shelter-card">
              <div className="shelter-header">
                <div>
                  <span style={{ fontSize: "11px", color: "var(--accent-emerald)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    {shelter.code}
                  </span>
                  <h3 className="shelter-title">{shelter.name}</h3>
                  <div className="shelter-sub">{shelter.type} • Elevation: {shelter.elevation}</div>
                </div>
                <span className={`badge ${String(shelter.status || "").includes("Active") ? "safe" : "short"}`}>
                  {shelter.status || "Unknown"}
                </span>
              </div>

              {/* CAPACITY PROGRESS */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Occupancy Level</span>
                  <strong style={{ color: occupancyPct > 80 ? "var(--accent-amber)" : "var(--accent-emerald)" }}>
                    {occupancyPct}% Occupied
                  </strong>
                </div>
                <div className="progress-bar-container" style={{ height: "10px" }}>
                  <div
                    className={`progress-bar-fill ${occupancyPct > 80 ? "danger" : "success"}`}
                    style={{ width: `${occupancyPct}%` }}
                  ></div>
                </div>
              </div>

              <div className="shelter-capacity-box">
                <div className="cap-item">
                  <span>Total Beds</span>
                  <strong>{shelter.capacity}</strong>
                </div>
                <div className="cap-item">
                  <span>Occupied</span>
                  <strong style={{ color: "var(--accent-cyan)" }}>{shelter.occupied}</strong>
                </div>
                <div className="cap-item">
                  <span>Available</span>
                  <strong style={{ color: "var(--accent-emerald)" }}>{shelter.available}</strong>
                </div>
              </div>

              {/* INVENTORY TAGS */}
              <div className="resource-tags">
                <span className="res-tag">💧 Water: {((shelter.waterStockLiters || 0) / 1000).toFixed(1)}k Liters</span>
                <span className="res-tag">🍞 Food: {Number(shelter.foodMealsStock || 0).toLocaleString()} Meals</span>
                <span className="res-tag">🩺 Medical Teams: {shelter.medicalTeams} Units</span>
                <span className="res-tag">⚡ Power: {shelter.powerGenerators} Gensets</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", paddingTop: "10px", borderTop: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Contact: {shelter.contact}
                </span>
                <button className="action-btn" style={{ fontSize: "12px" }} onClick={() => onSelectShelter(shelter)}>
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
