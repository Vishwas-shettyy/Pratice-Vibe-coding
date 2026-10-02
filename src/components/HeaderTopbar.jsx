import React from "react";

function HeaderTopbar({ title, subtitle, theme, onToggleTheme, onTriggerEmergency, onExportReport, latestAlert, backendOnline, isHarshCaseActive, onToggleHarshCase }) {
  return (
    <>
      <header className="top-header" style={{ padding: "16px 28px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h1 className="page-title">{title}</h1>
          {title === "Disaster Intelligence Command Center" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, color: backendOnline ? "var(--accent-safe)" : "var(--accent-warning)", letterSpacing: "0.5px" }}>
              <span style={{ fontSize: "10px" }}>●</span>
              {backendOnline ? "SYSTEM ONLINE - Flask Backend Connected" : "SYSTEM OFFLINE - Using Local Fallback Data"}
            </div>
          ) : (
            <p className="page-description">{subtitle}</p>
          )}
        </div>

        <div className="top-actions">
          <button className="action-btn danger pulse-red" onClick={onTriggerEmergency}>
            Emergency Broadcast
          </button>

          <button className="action-btn" onClick={onExportReport}>
            Export GIS Report
          </button>

          {/* HARSH CASE Stress Scenario Toggle */}
          <button
            className={`action-btn ${isHarshCaseActive ? "danger" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              background: isHarshCaseActive ? "rgba(239, 68, 68, 0.15)" : "var(--bg-card)",
              border: isHarshCaseActive ? "1px solid var(--accent-red)" : "1px solid var(--border-color)",
              color: isHarshCaseActive ? "var(--accent-red)" : "var(--text-secondary)",
              transition: "all 0.2s ease",
            }}
            onClick={onToggleHarshCase}
            title={
              isHarshCaseActive
                ? "HARSH CASE ACTIVE: Extreme disaster stress simulation. Click to turn OFF."
                : "HARSH CASE OFF: Click to run extreme disaster stress simulation (deterministic simulation only)."
            }
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isHarshCaseActive ? "var(--accent-red)" : "var(--text-muted)",
                display: "inline-block",
                boxShadow: isHarshCaseActive ? "0 0 6px var(--accent-red)" : "none",
              }}
            ></span>
            {isHarshCaseActive ? "HARSH CASE ON" : "HARSH CASE OFF"}
          </button>

          {/* Theme Switcher Toggle Button */}
          <button
            className="action-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px",
              background: "var(--bg-card)",
            }}
            onClick={onToggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? (
              <svg width="16" height="16" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg width="16" height="16" fill="none" stroke="#8b5cf6" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {latestAlert && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", borderBottom: "1px solid rgba(239, 68, 68, 0.2)", padding: "12px 28px", display: "flex", alignItems: "flex-start", gap: "16px" }}>
          <div style={{ background: "var(--accent-red)", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "4px", letterSpacing: "1px", flexShrink: 0, marginTop: "2px" }}>
            {latestAlert.severity?.toUpperCase() || "LIVE ALERT"}
          </div>
          {latestAlert.id && !latestAlert.id.startsWith("ALT-SIM-") && (
            <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--text-muted)", color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, padding: "4px 8px", borderRadius: "4px", letterSpacing: "1px", flexShrink: 0, marginTop: "2px" }}>
              DEMO / FALLBACK DATA
            </div>
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ color: "var(--accent-red)", fontSize: "14px", fontWeight: 700 }}>
              {latestAlert.title}
              {latestAlert.area && <span style={{ color: "var(--text-secondary)", fontWeight: 600, marginLeft: "8px" }}>— {latestAlert.area}</span>}
            </div>
            <div style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 500 }}>
              {latestAlert.message}
            </div>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: 600, flexShrink: 0 }}>
            {latestAlert.time || "Just now"}
          </div>
        </div>
      )}
    </>
  );
}

export default HeaderTopbar;
