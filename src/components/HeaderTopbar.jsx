import React from "react";

function HeaderTopbar({ title, subtitle, theme, onToggleTheme, onTriggerEmergency, onExportReport, latestAlert }) {
  return (
    <>
      <header className="top-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{subtitle}</p>
        </div>

        <div className="top-actions">
          {/* Theme Switcher Toggle Button */}
          <button
            className="action-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              cursor: "pointer",
              padding: "8px 14px",
              borderRadius: "8px"
            }}
            onClick={onToggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? (
              <>
                <svg width="16" height="16" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="none" stroke="#8b5cf6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <button className="action-btn" onClick={onExportReport}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export GIS Report
          </button>

          <button className="action-btn danger pulse-red" onClick={onTriggerEmergency}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Emergency Broadcast
          </button>
        </div>
      </header>

      {latestAlert && (
        <div className="alert-marquee">
          <span className="alert-tag">LIVE ALERT</span>
          <div className="marquee-content">
            <strong>[{latestAlert.title}]</strong>: {latestAlert.message} ({latestAlert.time})
          </div>
        </div>
      )}
    </>
  );
}

export default HeaderTopbar;
